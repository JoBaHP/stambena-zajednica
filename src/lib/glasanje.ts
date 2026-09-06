import { db } from "@/lib/db"

// Zakon o stanovanju odluke skupstine vezuje za vlasnicki udeo, ne za broj
// glava: kvorum i vecina se racunaju po kvadraturi. Dok kvadrature nisu unete,
// prikaz pada nazad na obicno brojanje glasova.

export type OptionTally = {
  id: string
  text: string
  votes: number
  /** Kvadratura koja je glasala za ovu opciju. */
  area: number
  /** Udeo u ukupnoj kvadraturi zgrade — po ovome se odluka donosi. */
  sharePct: number
  /** Udeo u datim glasovima — samo za kontekst. */
  castPct: number
  passes: boolean
}

export type PollTally = {
  /** Ima li dovoljno unetih kvadratura da se racuna po udelu. */
  weighted: boolean
  requiredShare: number
  totalArea: number
  votedArea: number
  quorumPct: number
  quorumMet: boolean
  totalVotes: number
  ownersTotal: number
  ownersWithArea: number
  ownersMissingArea: number
  options: OptionTally[]
}

type PollOptionInput = { id: string; text: string }

export async function tallyPoll(
  pollId: string,
  options: PollOptionInput[],
  requiredShare: number,
): Promise<PollTally> {
  // Vlasnicima se smatraju aktivni nalozi kojima je dodeljen stan — isti krug
  // koji dobija obavestenja. Nalog bez pristupa ne ulazi ni u imenilac kvoruma,
  // inace kvorum ne bi mogao da se dostigne.
  const [owners, votes] = await Promise.all([
    db.user.findMany({
      where: { active: true, unit: { not: null } },
      select: { id: true, area: true },
    }),
    db.vote.findMany({
      where: { pollId },
      select: { optionId: true, voterId: true },
    }),
  ])

  const areaOf = new Map(owners.map((o) => [o.id, Number(o.area ?? 0)]))
  const ownersWithArea = owners.filter((o) => Number(o.area ?? 0) > 0).length
  const totalArea = owners.reduce((sum, o) => sum + Number(o.area ?? 0), 0)

  // Racunanje po udelu ima smisla tek kad svi vlasnici imaju unetu kvadraturu —
  // inace bi imenilac bio manji od stvarnog i procenti bi bili naduvani.
  const weighted = owners.length > 0 && ownersWithArea === owners.length && totalArea > 0

  const votedArea = votes.reduce((sum, v) => sum + (areaOf.get(v.voterId) ?? 0), 0)
  const totalVotes = votes.length

  const tallied = options.map((option) => {
    const own = votes.filter((v) => v.optionId === option.id)
    const area = own.reduce((sum, v) => sum + (areaOf.get(v.voterId) ?? 0), 0)
    const sharePct = weighted && totalArea > 0 ? (area / totalArea) * 100 : 0
    return {
      id: option.id,
      text: option.text,
      votes: own.length,
      area,
      sharePct,
      castPct: totalVotes > 0 ? (own.length / totalVotes) * 100 : 0,
      passes: weighted && sharePct >= requiredShare,
    }
  })

  const quorumPct = weighted && totalArea > 0 ? (votedArea / totalArea) * 100 : 0

  return {
    weighted,
    requiredShare,
    totalArea,
    votedArea,
    quorumPct,
    // Kvorum je izlaznost; da li je odluka doneta zavisi od `passes` po opciji.
    quorumMet: weighted && quorumPct > 50,
    totalVotes,
    ownersTotal: owners.length,
    ownersWithArea,
    ownersMissingArea: owners.length - ownersWithArea,
    options: tallied,
  }
}

export function formatArea(value: number): string {
  return `${value.toLocaleString("sr-RS", { maximumFractionDigits: 2 })} m²`
}
