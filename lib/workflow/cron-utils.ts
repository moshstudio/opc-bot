export interface VisualCronConfig {
  frequency: "minutely" | "hourly" | "daily" | "weekly" | "monthly";
  time?: string; // HH:mm
  daysOfWeek?: string; // 0-6
  daysOfMonth?: string; // 1-31
  interval?: number; // for hourly/minutely
  minute?: number; // Specific minute for hourly
}

export function generateCron(config: VisualCronConfig): string {
  const {
    frequency,
    time,
    daysOfWeek,
    daysOfMonth,
    interval,
    minute: specificMinute,
  } = config;
  const [hour, minute] = (time || "09:00")
    .split(":")
    .map((v) => parseInt(v) || 0);

  const targetMinute = specificMinute !== undefined ? specificMinute : minute;

  switch (frequency) {
    case "minutely":
      if (interval && interval > 1) {
        return `0 */${interval} * * * *`;
      }
      return `0 * * * * *`;
    case "hourly":
      if (interval && interval > 1) {
        return `0 ${targetMinute} */${interval} * * *`;
      }
      return `0 ${targetMinute} * * * *`;
    case "daily":
      return `0 ${minute} ${hour} * * *`;
    case "weekly":
      const days = daysOfWeek || "1";
      return `0 ${minute} ${hour} * * ${days}`;
    case "monthly":
      const dom = daysOfMonth || "1";
      return `0 ${minute} ${hour} ${dom} * *`;
    default:
      return "0 */30 * * * *";
  }
}

export function getReadableDescription(config: VisualCronConfig): string {
  const {
    frequency,
    time,
    daysOfWeek,
    daysOfMonth,
    interval,
    minute: specificMinute,
  } = config;
  const timeStr = time || "09:00";
  const targetMinute =
    specificMinute !== undefined
      ? specificMinute
      : parseInt(timeStr.split(":")[1]) || 0;

  switch (frequency) {
    case "minutely":
      if (interval && interval > 1) {
        return `每隔 ${interval} 分钟执行一次`;
      }
      return "每分钟执行一次";
    case "hourly":
      const minDesc = targetMinute > 0 ? `第 ${targetMinute} 分钟` : "整点";
      if (interval && interval > 1) {
        return `每隔 ${interval} 小时的 ${minDesc} 执行一次`;
      }
      return `每小时的 ${minDesc} 执行一次`;
    case "daily":
      return `每天 ${timeStr} 执行一次`;
    case "weekly":
      const weekMap: Record<string, string> = {
        "0": "周日",
        "1": "周一",
        "2": "周二",
        "3": "周三",
        "4": "周四",
        "5": "周五",
        "6": "周六",
      };
      const days = (daysOfWeek || "1")
        .split(",")
        .map((d) => weekMap[d.trim()] || d)
        .join("、");
      return `每周 ${days} 的 ${timeStr} 执行`;
    case "monthly":
      return `每月 ${daysOfMonth || "1"} 号的 ${timeStr} 执行`;
    default:
      return "定时执行";
  }
}

export function parseCron(cron: string): Partial<VisualCronConfig> {
  if (!cron) return {};
  const parts = cron.split(" ");
  if (parts.length < 5) return {};

  // Standard cron usually has 5 parts: min hour dom month dow
  // Our system seems to use 6 parts: sec min hour dom month dow
  const hasSeconds = parts.length >= 6;
  const offset = hasSeconds ? 1 : 0;

  const min = parts[0 + offset];
  const hour = parts[1 + offset];
  const dom = parts[2 + offset];
  const month = parts[3 + offset];
  const dow = parts[4 + offset];

  // Minutely: 0 */15 * * * *
  if (hour === "*" && dom === "*" && month === "*" && dow === "*") {
    if (min.includes("/")) {
      return {
        frequency: "minutely",
        interval: parseInt(min.split("/")[1]) || 1,
      };
    }
    if (min === "*") {
      return { frequency: "minutely", interval: 1 };
    }
  }

  // Hourly: 0 5 */2 * * *
  if (dom === "*" && month === "*" && dow === "*") {
    const minute = parseInt(min) || 0;
    if (hour.includes("/")) {
      return {
        frequency: "hourly",
        interval: parseInt(hour.split("/")[1]) || 1,
        minute: minute,
      };
    }
    if (hour === "*") {
      return { frequency: "hourly", interval: 1, minute: minute };
    }
  }

  // Weekly: 0 30 9 * * 1,3,5
  if (dow !== "*") {
    const h = (parseInt(hour) || 0).toString().padStart(2, "0");
    const m = (parseInt(min) || 0).toString().padStart(2, "0");
    return {
      frequency: "weekly",
      time: `${h}:${m}`,
      daysOfWeek: dow,
    };
  }

  // Monthly: 0 30 9 1,15 * *
  if (dom !== "*") {
    const h = (parseInt(hour) || 0).toString().padStart(2, "0");
    const m = (parseInt(min) || 0).toString().padStart(2, "0");
    return {
      frequency: "monthly",
      time: `${h}:${m}`,
      daysOfMonth: dom,
    };
  }

  // Daily: 0 30 9 * * *
  const h = (parseInt(hour) || 0).toString().padStart(2, "0");
  const m = (parseInt(min) || 0).toString().padStart(2, "0");
  return {
    frequency: "daily",
    time: `${h}:${m}`,
  };
}
