type ParticipantStats = {
  DBNOs: number;
  assists: number;
  boosts: number;
  damageDealt: number;
  deathType: string;
  headshotKills: number;
  heals: number;
  killPlace: number;
  killStreaks: number;
  kills: number;
  longestKill: number;
  name: string;
  playerId: string;
  revives: number;
  rideDistance: number;
  roadKills: number;
  swimDistance: number;
  teamKills: number;
  timeSurvived: number;
  vehicleDestroys: number;
  walkDistance: number;
  weaponsAcquired: number;
  winPlace: number;
};

type Participant = {
  id: string;
  teamId: number;
  rank: number;
  teamTotal: number;
  shardId: string;
  stats: ParticipantStats;
};

type Match = {
  id: string;
  createdAt: string;
  duration: number;
  matchType: string;
  gameMode: string;
  mapName: string;
  isCustomMatch: boolean;
  shard: string;
  participants: Participant[];
};

type LegacyParticipant = {
  id: number;
  teamId: number;
  teamRank: number;
  teamTotal: number;
  shard: string;
  dbnos: number;
  assists: number;
  boosts: number;
  damageDealt: number;
  deathType: string;
  headshotKills: number;
  heals: number;
  killPlace: number;
  killStreaks: number;
  kills: number;
  longestKill: number;
  name: string;
  playerId: string;
  revives: number;
  rideDistance: number;
  roadKills: number;
  swimDistance: number;
  teamKills: number;
  timeSurvived: number;
  vehicleDestroys: number;
  walkDistance: number;
  weaponsAcquired: number;
  winPlace: number;
  mainWeapon?: string;
};

type LegacyMatch = Omit<Match, "participants"> & {
  participants: LegacyParticipant[];
  log_id?: string;
};
