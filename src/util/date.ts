import dayjs from "dayjs";

export const DateFormat = "YYYY-MM-DD HH:mm:ss";

export type ForgettingCurveTimeType = {
  level: number,
  name: string,
  description: string,
  date: (date?: any) => string
}

export const ForgettingCurveTime: Array<ForgettingCurveTimeType> = [
  {
    level: 20,
    name: "20 minutes",
    description: "Very Hard",
    date: (date?: any) => dayjs(date).add(20, 'minutes').format(DateFormat)
  }, {
    level: 60,
    name: "1 hours",
    description: "Hard",
    date: (date?: any) => dayjs(date).add(1, 'hours').format(DateFormat)
  }, {
    level: 480,
    name: "8 hours",
    description: "Normal",
    date: (date?: any) => dayjs(date).add(8, 'hours').format(DateFormat)
  }, {
    level: 1440,
    name: "1 days",
    description: "Easy",
    date: (date?: any) => dayjs(date).add(1, 'days').format(DateFormat)
  }, {
    level: 2880,
    name: "2 days",
    description: "Very Easy",
    date: (date?: any) => dayjs(date).add(2, 'days').format(DateFormat)
  }, {
    level: 10080,
    name: "7 days",
    description: "Maybe Forget",
    date: (date?: any) => dayjs(date).add(7, 'days').format(DateFormat)
  }, {
    level: 43200,
    name: "30 days",
    description: "Impossible Forget",
    date: (date?: any) => dayjs(date).add(30, 'days').format(DateFormat)
  }
];

const map: {
  [key: number]: ForgettingCurveTimeType
} = {};

for (let i of ForgettingCurveTime) {
  map[i.level] = i;
}

export const ForgettingCurveTimeMap = map;

export function getNextForgettingCurveTime(level: number): ForgettingCurveTimeType | null {
  let flag = false;
  for (let i of ForgettingCurveTime) {
    if (flag) return i;
    if (i.level === level) flag = true;
  }
  return null;
}

export function getLastForgettingCurveTime(level: number): ForgettingCurveTimeType | null {
  let last = null;
  for (let i of ForgettingCurveTime) {
    if (i.level === level) return last;
    last = i;
  }
  return null;
}

export function getForgettingCurveTime(level: number): ForgettingCurveTimeType | null {
  for (let i of ForgettingCurveTime) {
    if (i.level === level) return i;
  }
  return null;
}

export function getDiffForgettingCurveTime(level1: number, level2: number): number | null {
  let time1 = getForgettingCurveTime(level1);
  if (!time1) return null;
  let time2 = getForgettingCurveTime(level2);
  if (!time2) return null;
  let position1 = ForgettingCurveTime.indexOf(time1);
  let position2 = ForgettingCurveTime.indexOf(time2);
  return position1 - position2;
}