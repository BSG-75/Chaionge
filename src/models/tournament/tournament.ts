import { SetupLike } from '@/models/setup'
import { has, isArray, FromDefinition, getTypeChecker } from '@/utils'
import isObject from 'lodash/isObject'
import isNumber from 'lodash/isNumber'

export class Match {
  constructor(winnerNext: number | null) {
    this.winnerNext = winnerNext
  }

  winnerNext: number | null
  loserNext: number | null = null
  p1: number | null = null
  p2: number | null = null
  p1Score: number | null = null
  p2Score: number | null = null
  winner: number | null = null
}
export const isMatch = (match: unknown): match is Match => {
  const keys: (keyof Match)[] = [
    'p1',
    'p2',
    'p1Score',
    'p2Score',
    'winner',
    'winnerNext',
    'loserNext'
  ];

  if (!isObject(match)) {
    return false;
  }

  return keys.every(<K extends keyof Match>(k: K) => {
    if (has(match, k)) {
      return isNumber(match[k]) || match[k] === null;
    }
    return false;
  });
}

const tournamentSpecificDefinition = {
  status: (x: unknown): x is 'started' => x === 'started',
  matches: (x: unknown): x is Match[] => isArray(x, isMatch),
  origins(x: unknown): x is Record<number, number[]> {
    // make sure all values of origins are number array
    return isObject(x) && Object.values(x).every(x => isArray(x, isNumber));
  }
}
type TournamentSpeficic = FromDefinition<typeof tournamentSpecificDefinition>;
const checkTournamentSpecific = getTypeChecker(tournamentSpecificDefinition);
export type Tournament = SetupLike & TournamentSpeficic;
export const isTournament = (x: SetupLike): x is Tournament => {
  return checkTournamentSpecific(x);
}

export const winMatch = (
  tournament: Tournament,
  matchId: number,
  winner: 'p1' | 'p2'
) => {
  const distribute = (target: Match, player: number) => {
    if (target.p1 === null) {
      target.p1 = player;
    }
    else if (target.p2 === null) {
      target.p2 = player;
    }
    else {
      throw Error('more than two players joining same match');
    }
  }

  const match = tournament.matches[matchId];
  if (match.p1 === null || match.p2 === null) {
    throw Error('cannot win with null players');
  }

  match.winner = match[winner];
  if (match.winner === null) {
    throw Error('cannot win with null players');
  }

  const loser = winner === 'p1' ? match.p2 : match.p1;
  if (match.winnerNext !== null) {
    distribute(tournament.matches[match.winnerNext], match.winner);
  }
  if (match.loserNext !== null) {
    distribute(tournament.matches[match.loserNext], loser);
  }
}

export const getOrigins = (tournament: Tournament, matches: number[]) =>
  matches
    .reduce((record, m) => {
      const match = tournament.matches[m];
      const setOrAppend = (key: number | null) => {
        if (key !== null) {
          record[key] = (record[key] || []).concat(m);
        }
      };
      setOrAppend(match.winnerNext);
      setOrAppend(match.loserNext);
      return record;
    }, Object.create(null) as Record<number, number[]>);

export const isRounds = (r: unknown): r is number[][] => {
  return isArray(r, (e): e is number[] => isArray(e, isNumber));
}