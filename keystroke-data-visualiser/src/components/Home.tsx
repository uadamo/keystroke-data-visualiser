import React from "react";

import "./section.css";
import "./section.css";
import { getDatabase, ref, query, get } from "firebase/database";
import { UserProfile } from "../types/Users";
import { app } from "../firebase";
import { Task, TaskIteration, KeyUp, KeyDown } from "../types/Tasks";
import { all } from "@tensorflow/tfjs";

const fetchUsers = async () => {
  const userRef = query(ref(db, `users`));
  let userList: UserProfile[] = [];
  const userSnapshot = await get(userRef);
  if (userSnapshot) {
    for (let userKey of Object.keys(userSnapshot.val())) {
      for (let userInnerKey of Object.keys(userSnapshot.val()[userKey])) {
        if (userSnapshot.val()[userKey][userInnerKey].session > 2) {
          userList.push(userSnapshot.val()[userKey][userInnerKey]);
        }
      }
    }
    return userList;
  }
};

const db = getDatabase(app);
const userList = await fetchUsers();

interface temporal_props {
  task: "1" | "2a" | "2b" | "2c";
  statistical?: boolean;
}

const UD = async ({ task, statistical }: temporal_props) => {
  // produce a record for each session try (10 tries per session),
  // return an array of 10 records
  // user; session; task; UD_q, UD_u, etc.
  const recordArray: any[] = [];
  let phrase = "";
  if (task === "1") {
    phrase = "qu!faB8*en";
  }
  if (task === "2a") {
    phrase = "thequickbrownfoxjumpsoverthelazydog";
  }
  if (task === "2b") {
    phrase = "Packmyboxwithfourdozenliquorjugs!";
  }
  if (task === "2c") {
    phrase = "therewereLOOSE$100billsinthecooler";
  }

  if (userList) {
    for (const user of userList) {
      const taskref = query(ref(db, `task${task}/user-${user.user_id}`));
      const taskSnapshot = await get(taskref);

      if (taskSnapshot) {
        for (let sesh = 0; sesh < user.session; ++sesh) {
          const iterationValues: TaskIteration[] = Object.values(
            taskSnapshot.val()[`session-${sesh}`]
          );

          const allKeyDowns = iterationValues
            .map((iterationValue) => {
              return iterationValue.keystroke_list;
            })
            .flat(1)
            .filter((keystroke) => keystroke.type === "keydown");

          const allKeyUps = iterationValues
            .map((iterationValue) => {
              return iterationValue.keystroke_list;
            })
            .flat(1)
            .filter((keystroke) => keystroke.type === "keyup");

          const iterations = iterationValues.map((iterationValue) => {
            return {
              start: iterationValue.start_time,
              end: iterationValue.end_time + 100,
            };
          });

          try {
            for (const [iterationNumber, iteration] of iterations.entries()) {
              const records: any[] = [];
              let iterationKeyUps = allKeyUps.filter(
                (keyUp) => keyUp.timestamp > iteration.start
              );
              let iterationKeyDowns = allKeyDowns.filter(
                (keyDown) => keyDown.globalTimeStamp > iteration.start
              );

              for (let step = 0; step < phrase.length; step++) {
                const upTime = iterationKeyUps.find(
                  (c, i) =>
                    c.key.toLowerCase() === phrase.charAt(step).toLowerCase() ||
                    (c.key === "8" &&
                      iterationKeyUps[i - 1].key === "Shift" &&
                      phrase.charAt(step) === "*") ||
                    (i + 1 < iterationKeyUps.length &&
                      c.key === "8" &&
                      iterationKeyUps[i + 1].key === "Shift" &&
                      phrase.charAt(step) === "*") ||
                    (c.key === "1" &&
                      iterationKeyUps[i - 1].key === "Shift" &&
                      phrase.charAt(step) === "!")
                );

                const downTime = iterationKeyDowns.find(
                  (c, i) =>
                    c.key.toLowerCase() ===
                      phrase.charAt(step + 1).toLowerCase() ||
                    (c.key === "8" &&
                      iterationKeyDowns[i - 1].key === "Shift" &&
                      phrase.charAt(step + 1) === "*") ||
                    (i + 1 < iterationKeyDowns.length &&
                      c.key === "8" &&
                      iterationKeyDowns[i + 1].key === "Shift" &&
                      phrase.charAt(step + 1) === "*") ||
                    (c.key === "1" &&
                      iterationKeyDowns[i - 1].key === "Shift" &&
                      phrase.charAt(step + 1) === "!")
                );
                if (downTime && upTime) {
                  records.push(downTime.globalTimeStamp - upTime.timestamp);
                  const upIteration = iterationKeyUps.findIndex(
                    (obj) => obj.timestamp === upTime.timestamp
                  );
                  const downIteration = iterationKeyDowns.findIndex(
                    (obj) => obj.globalTimeStamp === downTime.globalTimeStamp
                  );
                  if (upIteration > -1 && downIteration > -1) {
                    iterationKeyUps.splice(0, upIteration + 1);
                    iterationKeyDowns.splice(0, downIteration + 1);
                  }
                }
              }
              if (
                (records.length === 9 && task === "1") ||
                (records.length === 34 && task === "2a") ||
                (records.length === 32 && task === "2b") ||
                (records.length === 33 && task === "2c")
              ) {
                if (statistical) {
                  const mean =
                    records.reduce((acc, val) => acc + val, 0) / records.length;
                  const stDev = Math.sqrt(
                    records
                      .map((x) => Math.pow(x - mean, 2))
                      .reduce((a, b) => a + b) / records.length
                  );

                  // kurtosis
                  const kurtosis =
                    records.reduce(
                      (acc, val) => acc + Math.pow(val - mean, 4),
                      0
                    ) /
                    (records.length * Math.pow(stDev, 4));

                  // skewness

                  const skewness =
                    records.reduce(
                      (acc, val) => acc + Math.pow(val - mean, 3),
                      0
                    ) /
                    (records.length * Math.pow(stDev, 3));

                  recordArray.push([
                    user.user_id,
                    sesh,
                    task,
                    iterationNumber,
                    ...records,
                    mean,
                    stDev,
                    kurtosis,
                    skewness,
                  ]);
                } else {
                  recordArray.push([
                    user.user_id,
                    sesh,
                    task,
                    iterationNumber,
                    ...records,
                  ]);
                }
              } else {
                console.log(iterationNumber);
              }
            }
          } catch (e) {
            // console.log(e);
          }
        }
      }
    }
  }

  let label: any[] = ["user", "session", "task", "iteration"];

  for (let step = 0; step < phrase.length - 1; step++) {
    label.push(`UD_${phrase.charAt(step) + phrase.charAt(step + 1)}`);
  }

  if (statistical) {
    label.push("mean", "standard_deviation", "kurtosis", "skewness");
  }

  recordArray.unshift(label);
  console.log(recordArray);

  const csvContent = recordArray
    .map((row) => row.map((item) => `"${item}"`).join(","))
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;

  a.download = statistical
    ? `UD_statistical_task${task}.csv`
    : `UD_task${task}.csv`;
  a.click();
};

const negUD = async ({ task }: temporal_props) => {
  const recordArray: any[] = [];
  let phrase = "";
  if (task === "1") {
    phrase = "qu!faB8*en";
  }
  if (task === "2a") {
    phrase = "thequickbrownfoxjumpsoverthelazydog";
  }
  if (task === "2b") {
    phrase = "Packmyboxwithfourdozenliquorjugs!";
  }
  if (task === "2c") {
    phrase = "therewereLOOSE$100billsinthecooler";
  }

  if (userList) {
    for (const user of userList) {
      const taskref = query(ref(db, `task${task}/user-${user.user_id}`));
      const taskSnapshot = await get(taskref);

      if (taskSnapshot) {
        for (let sesh = 0; sesh < user.session; ++sesh) {
          const iterationValues: TaskIteration[] = Object.values(
            taskSnapshot.val()[`session-${sesh}`]
          );

          const allKeyDowns = iterationValues
            .map((iterationValue) => {
              return iterationValue.keystroke_list;
            })
            .flat(1)
            .filter((keystroke) => keystroke.type === "keydown");

          const allKeyUps = iterationValues
            .map((iterationValue) => {
              return iterationValue.keystroke_list;
            })
            .flat(1)
            .filter((keystroke) => keystroke.type === "keyup");

          const iterations = iterationValues.map((iterationValue) => {
            return {
              start: iterationValue.start_time,
              end: iterationValue.end_time,
            };
          });

          try {
            for (const [iterationNumber, iteration] of iterations.entries()) {
              const records: any[] = [];
              let iterationKeyUps = allKeyUps.filter(
                (keyUp) => keyUp.timestamp > iteration.start
              );
              let iterationKeyDowns = allKeyDowns.filter(
                (keyDown) => keyDown.globalTimeStamp > iteration.start
              );

              for (let step = 0; step < phrase.length - 1; step++) {
                const upTime = iterationKeyUps.find(
                  (c, i) =>
                    c.key.toLowerCase() === phrase.charAt(step).toLowerCase() ||
                    (c.key === "8" &&
                      iterationKeyUps[i - 1].key === "Shift" &&
                      phrase.charAt(step) === "*") ||
                    (i + 1 < iterationKeyUps.length &&
                      c.key === "8" &&
                      iterationKeyUps[i + 1].key === "Shift" &&
                      phrase.charAt(step) === "*") ||
                    (c.key === "1" &&
                      iterationKeyUps[i - 1].key === "Shift" &&
                      phrase.charAt(step) === "!")
                );

                const downTime = iterationKeyDowns.find(
                  (c, i) =>
                    c.key.toLowerCase() ===
                      phrase.charAt(step + 1).toLowerCase() ||
                    (c.key === "8" &&
                      iterationKeyDowns[i - 1].key === "Shift" &&
                      phrase.charAt(step + 1) === "*") ||
                    (i + 1 < iterationKeyDowns.length &&
                      c.key === "8" &&
                      iterationKeyDowns[i + 1].key === "Shift" &&
                      phrase.charAt(step + 1) === "*") ||
                    (c.key === "1" &&
                      iterationKeyDowns[i - 1].key === "Shift" &&
                      phrase.charAt(step + 1) === "!")
                );
                if (downTime && upTime) {
                  records.push(downTime.globalTimeStamp - upTime.timestamp);
                  const upIteration = iterationKeyUps.findIndex(
                    (obj) => obj.timestamp === upTime.timestamp
                  );
                  const downIteration = iterationKeyDowns.findIndex(
                    (obj) => obj.globalTimeStamp === downTime.globalTimeStamp
                  );
                  if (upIteration > -1 && downIteration > -1) {
                    iterationKeyUps.splice(0, upIteration + 1);
                    iterationKeyDowns.splice(0, downIteration + 1);
                  }
                }
              }
              if (
                (records.length === 9 && task === "1") ||
                (records.length === 34 && task === "2a") ||
                (records.length === 32 && task === "2b") ||
                (records.length === 33 && task === "2c")
              ) {
                const allTimes = records.length;
                const negativeTimes = records.filter((r) => r < 0).length;
                const negativeUDPercentage = negativeTimes / allTimes;
                recordArray.push([
                  user.user_id,
                  sesh,
                  task,
                  iterationNumber,
                  negativeUDPercentage,
                ]);
              }
            }
          } catch (e) {
            console.log(e);
          }
        }
      }
    }
  }

  let label: any[] = [
    "user",
    "session",
    "task",
    "iteration",
    "negative_UD_percentage",
  ];

  recordArray.unshift(label);

  console.log(recordArray);

  const csvContent = recordArray
    .map((row) => row.map((item) => `"${item}"`).join(","))
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;

  a.download = `UD_negative_task${task}.csv`;
  a.click();
};

const DU = async ({ task, statistical }: temporal_props) => {
  const recordArray: any[] = [];
  let phrase = "";
  if (task === "1") {
    phrase = "qu!faB8*en";
  }
  if (task === "2a") {
    phrase = "thequickbrownfoxjumpsoverthelazydog";
  }
  if (task === "2b") {
    phrase = "Packmyboxwithfourdozenliquorjugs!";
  }
  if (task === "2c") {
    phrase = "therewereLOOSE$100billsinthecooler";
  }
  // produce a record for each session try (10 tries per session),
  // return an array of 10 records
  // user; session; task; DU_q, DU_u, etc.

  if (userList) {
    for (const user of userList) {
      const taskref = query(ref(db, `task${task}/user-${user.user_id}`));
      const taskSnapshot = await get(taskref);

      if (taskSnapshot) {
        for (let sesh = 0; sesh < user.session; ++sesh) {
          const iterationValues: TaskIteration[] = Object.values(
            taskSnapshot.val()[`session-${sesh}`]
          );

          const allKeyDowns = iterationValues
            .map((iterationValue) => {
              return iterationValue.keystroke_list;
            })
            .flat(1)
            .filter((keystroke) => keystroke.type === "keydown");

          const allKeyUps = iterationValues
            .map((iterationValue) => {
              return iterationValue.keystroke_list;
            })
            .flat(1)
            .filter((keystroke) => keystroke.type === "keyup");

          const iterations = iterationValues.map((iterationValue) => {
            return {
              start: iterationValue.start_time,
              end: iterationValue.end_time,
            };
          });

          try {
            for (const [iterationNumber, iteration] of iterations.entries()) {
              const records: any[] = [];
              let iterationKeyUps = allKeyUps.filter(
                (keyUp) => keyUp.timestamp > iteration.start
              );
              let iterationKeyDowns = allKeyDowns.filter(
                (keyDown) => keyDown.globalTimeStamp > iteration.start
              );

              for (let step = 0; step < phrase.length; step++) {
                const upTime = iterationKeyUps.find(
                  (c, i) =>
                    c.key.toLowerCase() === phrase.charAt(step).toLowerCase() ||
                    (c.key === "8" &&
                      iterationKeyUps[i - 1].key === "Shift" &&
                      phrase.charAt(step) === "*") ||
                    (i + 1 < iterationKeyUps.length &&
                      c.key === "8" &&
                      iterationKeyUps[i + 1].key === "Shift" &&
                      phrase.charAt(step) === "*") ||
                    (c.key === "1" &&
                      iterationKeyUps[i - 1].key === "Shift" &&
                      phrase.charAt(step) === "!")
                );

                const downTime = iterationKeyDowns.find(
                  (c, i) =>
                    c.key.toLowerCase() === phrase.charAt(step).toLowerCase() ||
                    (c.key === "8" &&
                      iterationKeyDowns[i - 1].key === "Shift" &&
                      phrase.charAt(step) === "*") ||
                    (i + 1 < iterationKeyDowns.length &&
                      c.key === "8" &&
                      iterationKeyDowns[i - 1].key === "Shift" &&
                      phrase.charAt(step) === "*") ||
                    (c.key === "1" &&
                      iterationKeyDowns[i + 1].key === "Shift" &&
                      phrase.charAt(step) === "!")
                );
                if (downTime && upTime) {
                  records.push(upTime.timestamp - downTime.globalTimeStamp);

                  const upIteration = iterationKeyUps.findIndex(
                    (obj) => obj.timestamp === upTime.timestamp
                  );
                  const downIteration = iterationKeyDowns.findIndex(
                    (obj) => obj.globalTimeStamp === downTime.globalTimeStamp
                  );
                  if (upIteration > -1 && downIteration > -1) {
                    iterationKeyUps.splice(0, upIteration + 1);
                    iterationKeyDowns.splice(0, downIteration + 1);
                  }
                }
              }
              if (
                (records.length === 10 && task === "1") ||
                (records.length === 35 && task === "2a") ||
                (records.length === 33 && task === "2b") ||
                (records.length === 34 && task === "2c")
              ) {
                if (statistical) {
                  const mean =
                    records.reduce((acc, val) => acc + val, 0) / records.length;
                  const stDev = Math.sqrt(
                    records
                      .map((x) => Math.pow(x - mean, 2))
                      .reduce((a, b) => a + b) / records.length
                  );

                  // kurtosis
                  const kurtosis =
                    records.reduce(
                      (acc, val) => acc + Math.pow(val - mean, 4),
                      0
                    ) /
                    (records.length * Math.pow(stDev, 4));

                  // skewness

                  const skewness =
                    records.reduce(
                      (acc, val) => acc + Math.pow(val - mean, 3),
                      0
                    ) /
                    (records.length * Math.pow(stDev, 3));

                  recordArray.push([
                    user.user_id,
                    sesh,
                    task,
                    iterationNumber,
                    ...records,
                    mean,
                    stDev,
                    kurtosis,
                    skewness,
                  ]);
                } else {
                  recordArray.push([
                    user.user_id,
                    sesh,
                    task,
                    iterationNumber,
                    ...records,
                  ]);
                }
              }
            }
          } catch (e) {
            console.log(e);
          }
        }
      }
    }
  }

  let label: any[] = ["user", "session", "task", "iteration"];

  for (let step = 0; step < phrase.length; step++) {
    label.push(`DU_${phrase.charAt(step)}`);
  }

  if (statistical) {
    label.push("mean", "standard_deviation", "kurtosis", "skewness");
  }
  recordArray.unshift(label);

  console.log(recordArray);

  const csvContent = recordArray
    .map((row) => row.map((item) => `"${item}"`).join(","))
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;

  a.download = statistical
    ? `DU_statistical_task${task}.csv`
    : `DU_task${task}.csv`;
  a.click();
};

const negUU = async ({ task }: temporal_props) => {
  const recordArray: any[] = [];
  let phrase = "";
  if (task === "1") {
    phrase = "qu!faB8*en";
  }
  if (task === "2a") {
    phrase = "thequickbrownfoxjumpsoverthelazydog";
  }
  if (task === "2b") {
    phrase = "Packmyboxwithfourdozenliquorjugs!";
  }
  if (task === "2c") {
    phrase = "therewereLOOSE$100billsinthecooler";
  }

  if (userList) {
    for (const user of userList) {
      const taskref = query(ref(db, `task${task}/user-${user.user_id}`));
      const taskSnapshot = await get(taskref);

      if (taskSnapshot) {
        for (let sesh = 0; sesh < user.session; ++sesh) {
          const iterationValues: TaskIteration[] = Object.values(
            taskSnapshot.val()[`session-${sesh}`]
          );

          const allKeyUps = iterationValues
            .map((iterationValue) => {
              return iterationValue.keystroke_list;
            })
            .flat(1)
            .filter((keystroke) => keystroke.type === "keyup");

          const iterations = iterationValues.map((iterationValue) => {
            return {
              start: iterationValue.start_time,
              end: iterationValue.end_time,
            };
          });

          try {
            for (const [iterationNumber, iteration] of iterations.entries()) {
              const records: any[] = [];
              let iterationKeyUps = allKeyUps.filter(
                (keyUp) => keyUp.timestamp > iteration.start
              );

              for (let step = 0; step < phrase.length; step++) {
                const upTime1 = iterationKeyUps.find(
                  (c, i) =>
                    c.key.toLowerCase() === phrase.charAt(step).toLowerCase() ||
                    (c.key === "8" &&
                      iterationKeyUps[i - 1].key === "Shift" &&
                      phrase.charAt(step) === "*") ||
                    (i + 1 < iterationKeyUps.length &&
                      c.key === "8" &&
                      iterationKeyUps[i + 1].key === "Shift" &&
                      phrase.charAt(step) === "*") ||
                    (c.key === "1" &&
                      iterationKeyUps[i - 1].key === "Shift" &&
                      phrase.charAt(step) === "!")
                );

                if (upTime1) {
                  const upIteration = iterationKeyUps.findIndex(
                    (obj) => obj.timestamp === upTime1.timestamp
                  );
                  if (upIteration > -1) {
                    iterationKeyUps.splice(0, upIteration + 1);
                  }
                }

                const upTime2 = iterationKeyUps.find(
                  (c, i) =>
                    c.key.toLowerCase() ===
                      phrase.charAt(step + 1).toLowerCase() ||
                    (c.key === "8" &&
                      iterationKeyUps[i - 1].key === "Shift" &&
                      phrase.charAt(step + 1) === "*") ||
                    (i + 1 < iterationKeyUps.length &&
                      c.key === "8" &&
                      iterationKeyUps[i + 1].key === "Shift" &&
                      phrase.charAt(step + 1) === "*") ||
                    (c.key === "1" &&
                      iterationKeyUps[i - 1].key === "Shift" &&
                      phrase.charAt(step + 1) === "!")
                );

                if (upTime1 && upTime2) {
                  records.push(upTime2.timestamp - upTime1.timestamp);
                }
              }
              if (
                (records.length === 9 && task === "1") ||
                (records.length === 34 && task === "2a") ||
                (records.length === 32 && task === "2b") ||
                (records.length === 33 && task === "2c")
              ) {
                const allTimes = records.length;
                const negativeTimes = records.filter((r) => r < 0).length;
                const negativeUUPercentage = negativeTimes / allTimes;
                recordArray.push([
                  user.user_id,
                  sesh,
                  task,
                  iterationNumber,
                  negativeUUPercentage,
                ]);
              }
            }
          } catch (e) {
            console.log(e);
          }
        }
      }
    }
  }

  let label: any[] = [
    "user",
    "session",
    "task",
    "iteration",
    "negative_UU_percentage",
  ];

  recordArray.unshift(label);

  console.log(recordArray);

  const csvContent = recordArray
    .map((row) => row.map((item) => `"${item}"`).join(","))
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;

  a.download = `UU_negative_task${task}.csv`;
  a.click();
  a.download = `UU_negative_task${task}.csv`;
  a.click();
};

const UU = async ({ task, statistical }: temporal_props) => {
  // produce a record for each session try (10 tries per session),
  // return an array of 10 records
  // user; session; task; UD_q, UD_u, etc.
  const recordArray: any[] = [];
  let phrase = "";
  if (task === "1") {
    phrase = "qu!faB8*en";
  }
  if (task === "2a") {
    phrase = "thequickbrownfoxjumpsoverthelazydog";
  }
  if (task === "2b") {
    phrase = "Packmyboxwithfourdozenliquorjugs!";
  }
  if (task === "2c") {
    phrase = "therewereLOOSE$100billsinthecooler";
  }

  if (userList) {
    for (const user of userList) {
      const taskref = query(ref(db, `task${task}/user-${user.user_id}`));
      const taskSnapshot = await get(taskref);

      if (taskSnapshot) {
        for (let sesh = 0; sesh < user.session; ++sesh) {
          const iterationValues: TaskIteration[] = Object.values(
            taskSnapshot.val()[`session-${sesh}`]
          );

          const allKeyUps = iterationValues
            .map((iterationValue) => {
              return iterationValue.keystroke_list;
            })
            .flat(1)
            .filter((keystroke) => keystroke.type === "keyup");

          const iterations = iterationValues.map((iterationValue) => {
            return {
              start: iterationValue.start_time,
              end: iterationValue.end_time,
            };
          });

          try {
            for (const [iterationNumber, iteration] of iterations.entries()) {
              const records: any[] = [];
              let iterationKeyUps = allKeyUps.filter(
                (keyUp) => keyUp.timestamp > iteration.start
              );

              for (let step = 0; step < phrase.length; step++) {
                const upTime1 = iterationKeyUps.find(
                  (c, i) =>
                    c.key.toLowerCase() === phrase.charAt(step).toLowerCase() ||
                    (c.key === "8" &&
                      iterationKeyUps[i - 1].key === "Shift" &&
                      phrase.charAt(step) === "*") ||
                    (i + 1 < iterationKeyUps.length &&
                      c.key === "8" &&
                      iterationKeyUps[i + 1].key === "Shift" &&
                      phrase.charAt(step) === "*") ||
                    (c.key === "1" &&
                      iterationKeyUps[i - 1].key === "Shift" &&
                      phrase.charAt(step) === "!")
                );

                if (upTime1) {
                  const upIteration = iterationKeyUps.findIndex(
                    (obj) => obj.timestamp === upTime1.timestamp
                  );
                  if (upIteration > -1) {
                    iterationKeyUps.splice(0, upIteration + 1);
                  }
                }

                const upTime2 = iterationKeyUps.find(
                  (c, i) =>
                    c.key.toLowerCase() ===
                      phrase.charAt(step + 1).toLowerCase() ||
                    (c.key === "8" &&
                      iterationKeyUps[i - 1].key === "Shift" &&
                      phrase.charAt(step + 1) === "*") ||
                    (i + 1 < iterationKeyUps.length &&
                      c.key === "8" &&
                      iterationKeyUps[i + 1].key === "Shift" &&
                      phrase.charAt(step + 1) === "*") ||
                    (c.key === "1" &&
                      iterationKeyUps[i - 1].key === "Shift" &&
                      phrase.charAt(step + 1) === "!")
                );

                if (upTime1 && upTime2) {
                  records.push(upTime2.timestamp - upTime1.timestamp);
                }
              }
              if (
                (records.length === 9 && task === "1") ||
                (records.length === 34 && task === "2a") ||
                (records.length === 32 && task === "2b") ||
                (records.length === 33 && task === "2c")
              ) {
                if (statistical) {
                  const mean =
                    records.reduce((acc, val) => acc + val, 0) / records.length;
                  const stDev = Math.sqrt(
                    records
                      .map((x) => Math.pow(x - mean, 2))
                      .reduce((a, b) => a + b) / records.length
                  );

                  // kurtosis
                  const kurtosis =
                    records.reduce(
                      (acc, val) => acc + Math.pow(val - mean, 4),
                      0
                    ) /
                    (records.length * Math.pow(stDev, 4));

                  // skewness

                  const skewness =
                    records.reduce(
                      (acc, val) => acc + Math.pow(val - mean, 3),
                      0
                    ) /
                    (records.length * Math.pow(stDev, 3));

                  recordArray.push([
                    user.user_id,
                    sesh,
                    task,
                    iterationNumber,
                    ...records,
                    mean,
                    stDev,
                    kurtosis,
                    skewness,
                  ]);
                } else {
                  recordArray.push([
                    user.user_id,
                    sesh,
                    task,
                    iterationNumber,
                    ...records,
                  ]);
                }
              }
            }
          } catch (e) {
            console.log(e);
          }
        }
      }
    }
  }

  let label: any[] = ["user", "session", "task", "iteration"];

  for (let step = 0; step < phrase.length - 1; step++) {
    label.push(`UU_${phrase.charAt(step) + phrase.charAt(step + 1)}`);
  }

  if (statistical) {
    label.push("mean", "standard_deviation", "kurtosis", "skewness");
  }

  recordArray.unshift(label);

  console.log(recordArray);

  const csvContent = recordArray
    .map((row) => row.map((item) => `"${item}"`).join(","))
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;

  a.download = statistical
    ? `UU_statistical_task${task}.csv`
    : `UU_task${task}.csv`;
  a.click();
};

const DD = async ({ task, statistical }: temporal_props) => {
  // produce a record for each session try (10 tries per session),
  // return an array of 10 records
  // user; session; task; UD_q, UD_u, etc.
  const recordArray: any[] = [];
  let phrase = "";
  if (task === "1") {
    phrase = "qu!faB8*en";
  }
  if (task === "2a") {
    phrase = "thequickbrownfoxjumpsoverthelazydog";
  }
  if (task === "2b") {
    phrase = "Packmyboxwithfourdozenliquorjugs!";
  }
  if (task === "2c") {
    phrase = "therewereLOOSE$100billsinthecooler";
  }

  if (userList) {
    for (const user of userList) {
      const taskref = query(ref(db, `task${task}/user-${user.user_id}`));
      const taskSnapshot = await get(taskref);

      if (taskSnapshot) {
        for (let sesh = 0; sesh < user.session; ++sesh) {
          const iterationValues: TaskIteration[] = Object.values(
            taskSnapshot.val()[`session-${sesh}`]
          );

          const allKeyDowns = iterationValues
            .map((iterationValue) => {
              return iterationValue.keystroke_list;
            })
            .flat(1)
            .filter((keystroke) => keystroke.type === "keydown");

          const iterations = iterationValues.map((iterationValue) => {
            return {
              start: iterationValue.start_time,
              end: iterationValue.end_time,
            };
          });

          try {
            for (const [iterationNumber, iteration] of iterations.entries()) {
              const records: any[] = [];
              let iterationKeyDowns = allKeyDowns.filter(
                (keyDown) =>
                  keyDown.globalTimeStamp > iteration.start &&
                  keyDown.globalTimeStamp <= iteration.end &&
                  keyDown.key !== "MediaPlayPause" &&
                  keyDown.code !== "Space"
              );

              for (let step = 0; step < phrase.length - 1; step++) {
                const downTime1 = iterationKeyDowns.find(
                  (c, i) =>
                    c.key.toLowerCase() === phrase.charAt(step).toLowerCase() ||
                    (c.key === "8" &&
                      iterationKeyDowns[i - 1].key === "Shift" &&
                      phrase.charAt(step) === "*") ||
                    (i + 1 < iterationKeyDowns.length &&
                      c.key === "8" &&
                      iterationKeyDowns[i + 1].key === "Shift" &&
                      phrase.charAt(step) === "*") ||
                    (c.key === "1" &&
                      iterationKeyDowns[i - 1].key === "Shift" &&
                      phrase.charAt(step) === "!")
                );

                if (downTime1) {
                  const downIteration = iterationKeyDowns.findIndex(
                    (obj) => obj.globalTimeStamp === downTime1.globalTimeStamp
                  );
                  if (downIteration > -1) {
                    iterationKeyDowns.splice(0, downIteration + 1);
                  }
                }

                const downTime2 = iterationKeyDowns.find(
                  (c, i) =>
                    c.key.toLowerCase() ===
                      phrase.charAt(step + 1).toLowerCase() ||
                    (c.key === "8" &&
                      iterationKeyDowns[i - 1].key === "Shift" &&
                      phrase.charAt(step + 1) === "*") ||
                    (i + 1 < iterationKeyDowns.length &&
                      c.key === "8" &&
                      iterationKeyDowns[i + 1].key === "Shift" &&
                      phrase.charAt(step + 1) === "*") ||
                    (c.key === "1" &&
                      iterationKeyDowns[i - 1].key === "Shift" &&
                      phrase.charAt(step + 1) === "!")
                );

                if (downTime1 && downTime2) {
                  records.push(
                    downTime2.globalTimeStamp - downTime1.globalTimeStamp
                  );
                }
              }
              if (
                (records.length === 9 && task === "1") ||
                (records.length === 34 && task === "2a") ||
                (records.length === 32 && task === "2b") ||
                (records.length === 33 && task === "2c")
              ) {
                if (statistical) {
                  const mean =
                    records.reduce((acc, val) => acc + val, 0) / records.length;
                  const stDev = Math.sqrt(
                    records
                      .map((x) => Math.pow(x - mean, 2))
                      .reduce((a, b) => a + b) / records.length
                  );

                  // kurtosis
                  const kurtosis =
                    records.reduce(
                      (acc, val) => acc + Math.pow(val - mean, 4),
                      0
                    ) /
                    (records.length * Math.pow(stDev, 4));

                  // skewness

                  const skewness =
                    records.reduce(
                      (acc, val) => acc + Math.pow(val - mean, 3),
                      0
                    ) /
                    (records.length * Math.pow(stDev, 3));

                  recordArray.push([
                    user.user_id,
                    sesh,
                    task,
                    iterationNumber,
                    ...records,
                    mean,
                    stDev,
                    kurtosis,
                    skewness,
                  ]);
                } else {
                  recordArray.push([
                    user.user_id,
                    sesh,
                    task,
                    iterationNumber,
                    ...records,
                  ]);
                }
              }
            }
          } catch (e) {
            console.log(e);
          }
        }
      }
    }
  }

  let label: any[] = ["user", "session", "task", "iteration"];

  for (let step = 0; step < phrase.length - 1; step++) {
    label.push(`DD_${phrase.charAt(step) + phrase.charAt(step + 1)}`);
  }

  if (statistical) {
    label.push("mean", "standard_deviation", "kurtosis", "skewness");
  }
  recordArray.unshift(label);

  console.log(recordArray);

  const csvContent = recordArray
    .map((row) => row.map((item) => `"${item}"`).join(","))
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;

  a.download = statistical
    ? `DD_statistical_task${task}.csv`
    : `DD_task${task}.csv`;
  a.click();
};

const trigraph = async ({ task, statistical }: temporal_props) => {
  // trigraph - down up

  // examples of trigraphs: qu!, u!f, !fa .. *en

  const recordArray: any[] = [];
  let phrase = "";
  if (task === "1") {
    phrase = "qu!faB8*en";
  }
  if (task === "2a") {
    phrase = "thequickbrownfoxjumpsoverthelazydog";
  }
  if (task === "2b") {
    phrase = "Packmyboxwithfourdozenliquorjugs!";
  }
  if (task === "2c") {
    phrase = "therewereLOOSE$100billsinthecooler";
  }

  if (userList) {
    for (const user of userList) {
      const taskref = query(ref(db, `task${task}/user-${user.user_id}`));
      const taskSnapshot = await get(taskref);

      if (taskSnapshot) {
        for (let sesh = 0; sesh < user.session; ++sesh) {
          const iterationValues: TaskIteration[] = Object.values(
            taskSnapshot.val()[`session-${sesh}`]
          );

          const allKeyDowns = iterationValues
            .map((iterationValue) => {
              return iterationValue.keystroke_list;
            })
            .flat(1)
            .filter((keystroke) => keystroke.type === "keydown");

          const allKeyUps = iterationValues
            .map((iterationValue) => {
              return iterationValue.keystroke_list;
            })
            .flat(1)
            .filter((keystroke) => keystroke.type === "keyup");

          const iterations = iterationValues.map((iterationValue) => {
            return {
              start: iterationValue.start_time,
              end: iterationValue.end_time,
            };
          });

          try {
            for (const [iterationNumber, iteration] of iterations.entries()) {
              const records: any[] = [];
              let iterationKeyUps = allKeyUps.filter(
                (keyUp) => keyUp.timestamp > iteration.start
              );
              let iterationKeyDowns = allKeyDowns.filter(
                (keyDown) => keyDown.globalTimeStamp > iteration.start
              );

              for (let step = 0; step < phrase.length - 2; step++) {
                const upTime = iterationKeyUps.find(
                  (c, i) =>
                    c.key.toLowerCase() ===
                      phrase.charAt(step + 2).toLowerCase() ||
                    (c.key === "8" &&
                      iterationKeyUps[i - 1].key === "Shift" &&
                      phrase.charAt(step + 2) === "*") ||
                    (i + 1 < iterationKeyUps.length &&
                      c.key === "8" &&
                      iterationKeyUps[i + 1].key === "Shift" &&
                      phrase.charAt(step + 2) === "*") ||
                    (c.key === "1" &&
                      iterationKeyUps[i - 1].key === "Shift" &&
                      phrase.charAt(step + 2) === "!")
                );

                const downTime = iterationKeyDowns.find(
                  (c, i) =>
                    c.key.toLowerCase() === phrase.charAt(step).toLowerCase() ||
                    (c.key === "8" &&
                      iterationKeyDowns[i - 1].key === "Shift" &&
                      phrase.charAt(step) === "*") ||
                    (i + 1 < iterationKeyDowns.length &&
                      c.key === "8" &&
                      iterationKeyDowns[i + 1].key === "Shift" &&
                      phrase.charAt(step) === "*") ||
                    (c.key === "1" &&
                      iterationKeyDowns[i - 1].key === "Shift" &&
                      phrase.charAt(step) === "!")
                );
                if (downTime && upTime) {
                  console.log(downTime.key + upTime.key);
                  records.push(upTime.timestamp - downTime.globalTimeStamp);
                  const upIteration = iterationKeyUps.findIndex(
                    (obj) => obj.timestamp === upTime.timestamp
                  );
                  const downIteration = iterationKeyDowns.findIndex(
                    (obj) => obj.globalTimeStamp === downTime.globalTimeStamp
                  );
                  if (upIteration > -1 && downIteration > -1) {
                    iterationKeyUps.splice(0, upIteration + 1);
                    iterationKeyDowns.splice(0, downIteration + 1);
                  }
                }
              }
              if (
                (records.length === 8 && task === "1") ||
                (records.length === 33 && task === "2a") ||
                (records.length === 31 && task === "2b") ||
                (records.length === 32 && task === "2c")
              ) {
                if (statistical) {
                  const mean =
                    records.reduce((acc, val) => acc + val, 0) / records.length;
                  const stDev = Math.sqrt(
                    records
                      .map((x) => Math.pow(x - mean, 2))
                      .reduce((a, b) => a + b) / records.length
                  );

                  // kurtosis
                  const kurtosis =
                    records.reduce(
                      (acc, val) => acc + Math.pow(val - mean, 4),
                      0
                    ) /
                    (records.length * Math.pow(stDev, 4));

                  // skewness

                  const skewness =
                    records.reduce(
                      (acc, val) => acc + Math.pow(val - mean, 3),
                      0
                    ) /
                    (records.length * Math.pow(stDev, 3));

                  recordArray.push([
                    user.user_id,
                    sesh,
                    task,
                    iterationNumber,
                    ...records,
                    mean,
                    stDev,
                    kurtosis,
                    skewness,
                  ]);
                } else {
                  recordArray.push([
                    user.user_id,
                    sesh,
                    task,
                    iterationNumber,
                    ...records,
                  ]);
                }
              }
            }
          } catch (e) {
            console.log(e);
          }
        }
      }
    }
  }

  let label: any[] = ["user", "session", "task", "iteration"];

  for (let step = 0; step < phrase.length - 2; step++) {
    label.push(
      `trigraph_${
        phrase.charAt(step) + phrase.charAt(step + 1) + phrase.charAt(step + 2)
      }`
    );
  }

  if (statistical) {
    label.push("mean", "standard_deviation", "kurtosis", "skewness");
  }

  recordArray.unshift(label);

  console.log(recordArray);

  const csvContent = recordArray
    .map((row) => row.map((item) => `"${item}"`).join(","))
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;

  a.download = statistical
    ? `trigraph_statistical_task${task}.csv`
    : `trigraph_task${task}.csv`;
  a.click();
};

const digraph = async ({ task, statistical }: temporal_props) => {
  const recordArray: any[] = [];
  let phrase = "";
  if (task === "1") {
    phrase = "qu!faB8*en";
  }
  if (task === "2a") {
    phrase = "thequickbrownfoxjumpsoverthelazydog";
  }
  if (task === "2b") {
    phrase = "Packmyboxwithfourdozenliquorjugs!";
  }
  if (task === "2c") {
    phrase = "therewereLOOSE$100billsinthecooler";
  }

  if (userList) {
    for (const user of userList) {
      const taskref = query(ref(db, `task${task}/user-${user.user_id}`));
      const taskSnapshot = await get(taskref);

      if (taskSnapshot) {
        for (let sesh = 0; sesh < user.session; ++sesh) {
          const iterationValues: TaskIteration[] = Object.values(
            taskSnapshot.val()[`session-${sesh}`]
          );

          const allKeyDowns = iterationValues
            .map((iterationValue) => {
              return iterationValue.keystroke_list;
            })
            .flat(1)
            .filter((keystroke) => keystroke.type === "keydown");

          const allKeyUps = iterationValues
            .map((iterationValue) => {
              return iterationValue.keystroke_list;
            })
            .flat(1)
            .filter((keystroke) => keystroke.type === "keyup");

          const iterations = iterationValues.map((iterationValue) => {
            return {
              start: iterationValue.start_time,
              end: iterationValue.end_time,
            };
          });

          try {
            for (const [iterationNumber, iteration] of iterations.entries()) {
              const records: any[] = [];
              let iterationKeyUps = allKeyUps.filter(
                (keyUp) => keyUp.timestamp > iteration.start
              );
              let iterationKeyDowns = allKeyDowns.filter(
                (keyDown) => keyDown.globalTimeStamp > iteration.start
              );

              for (let step = 0; step < phrase.length - 1; step++) {
                const upTime = iterationKeyUps.find(
                  (c, i) =>
                    c.key.toLowerCase() ===
                      phrase.charAt(step + 1).toLowerCase() ||
                    (c.key === "8" &&
                      iterationKeyUps[i - 1].key === "Shift" &&
                      phrase.charAt(step + 1) === "*") ||
                    (i + 1 < iterationKeyUps.length &&
                      c.key === "8" &&
                      iterationKeyUps[i + 1].key === "Shift" &&
                      phrase.charAt(step + 1) === "*") ||
                    (c.key === "1" &&
                      iterationKeyUps[i - 1].key === "Shift" &&
                      phrase.charAt(step + 1) === "!")
                );

                const downTime = iterationKeyDowns.find(
                  (c, i) =>
                    c.key.toLowerCase() === phrase.charAt(step).toLowerCase() ||
                    (c.key === "8" &&
                      iterationKeyDowns[i - 1].key === "Shift" &&
                      phrase.charAt(step) === "*") ||
                    (i + 1 < iterationKeyDowns.length &&
                      c.key === "8" &&
                      iterationKeyDowns[i + 1].key === "Shift" &&
                      phrase.charAt(step) === "*") ||
                    (c.key === "1" &&
                      iterationKeyDowns[i - 1].key === "Shift" &&
                      phrase.charAt(step) === "!")
                );
                if (downTime && upTime) {
                  console.log(downTime.key + upTime.key);
                  records.push(upTime.timestamp - downTime.globalTimeStamp);
                  const upIteration = iterationKeyUps.findIndex(
                    (obj) => obj.timestamp === upTime.timestamp
                  );
                  const downIteration = iterationKeyDowns.findIndex(
                    (obj) => obj.globalTimeStamp === downTime.globalTimeStamp
                  );
                  if (upIteration > -1 && downIteration > -1) {
                    iterationKeyUps.splice(0, upIteration + 1);
                    iterationKeyDowns.splice(0, downIteration + 1);
                  }
                }
              }
              if (
                (records.length === 9 && task === "1") ||
                (records.length === 34 && task === "2a") ||
                (records.length === 32 && task === "2b") ||
                (records.length === 33 && task === "2c")
              ) {
                if (statistical) {
                  const mean =
                    records.reduce((acc, val) => acc + val, 0) / records.length;
                  const stDev = Math.sqrt(
                    records
                      .map((x) => Math.pow(x - mean, 2))
                      .reduce((a, b) => a + b) / records.length
                  );
                  // kurtosis

                  const kurtosis =
                    records.reduce(
                      (acc, val) => acc + Math.pow(val - mean, 4),
                      0
                    ) /
                    (records.length * Math.pow(stDev, 4));

                  // skewness

                  const skewness =
                    records.reduce(
                      (acc, val) => acc + Math.pow(val - mean, 3),
                      0
                    ) /
                    (records.length * Math.pow(stDev, 3));

                  recordArray.push([
                    user.user_id,
                    sesh,
                    task,
                    iterationNumber,
                    ...records,
                    mean,
                    stDev,
                    kurtosis,
                    skewness,
                  ]);
                } else {
                  recordArray.push([
                    user.user_id,
                    sesh,
                    task,
                    iterationNumber,
                    ...records,
                  ]);
                }
              }
            }
          } catch (e) {
            console.log(e);
          }
        }
      }
    }
  }

  let label: any[] = ["user", "session", "task", "iteration"];

  for (let step = 0; step < phrase.length - 1; step++) {
    label.push(`digraph_${phrase.charAt(step) + phrase.charAt(step + 1)}`);
  }

  if (statistical) {
    label.push("mean", "standard_deviation", "kurtosis", "skewness");
  }

  recordArray.unshift(label);

  console.log(recordArray);

  const csvContent = recordArray
    .map((row) => row.map((item) => `"${item}"`).join(","))
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;

  a.download = statistical
    ? `digraph_statistical_task${task}.csv`
    : `digraph_task${task}.csv`;
  a.click();
};
const typingSpeed = async ({ task }: temporal_props) => {
  // for each session -> each iteration in a session, derive a typing speed
  // user_id, session, task, iteration, speed

  const recordArray: any[] = [];

  if (userList) {
    for (const user of userList) {
      const taskref = query(ref(db, `task${task}/user-${user.user_id}`));
      const taskSnapshot = await get(taskref);

      if (taskSnapshot) {
        for (let sesh = 0; sesh < user.session; ++sesh) {
          const iterationValues: TaskIteration[] = Object.values(
            taskSnapshot.val()[`session-${sesh}`]
          );

          const allKeyDowns = iterationValues
            .map((iterationValue) => {
              return iterationValue.keystroke_list;
            })
            .flat(1)
            .filter((keystroke) => keystroke.type === "keydown");

          const iterations = iterationValues.map((iterationValue) => {
            return {
              start: iterationValue.start_time,
              end: iterationValue.end_time,
            };
          });

          try {
            for (const [iterationNumber, iteration] of iterations.entries()) {
              let iterationKeyDowns = allKeyDowns.filter(
                (keyDown) =>
                  keyDown.globalTimeStamp > iteration.start &&
                  keyDown.globalTimeStamp <= iteration.end + 1000
              );

              const totalWords = iterationKeyDowns.length / 5;
              const minutes =
                (iterationKeyDowns[iterationKeyDowns.length - 1]
                  .globalTimeStamp -
                  iterationKeyDowns[0].globalTimeStamp) /
                60000;

              recordArray.push([
                user.user_id,
                sesh,
                task,
                iterationNumber,
                totalWords / minutes,
              ]);
            }
          } catch (e) {
            console.log(e);
          }
        }
      }
    }
  }

  let label: any[] = ["user", "session", "task", "iteration", "speed"];

  recordArray.unshift(label);

  console.log(recordArray);

  const csvContent = recordArray
    .map((row) => row.map((item) => `"${item}"`).join(","))
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;

  a.download = `speed_task${task}.csv`;
  a.click();
};

const accuracy = async ({ task }: temporal_props) => {
  const recordArray: any[] = [];

  if (userList) {
    for (const user of userList) {
      const taskref = query(ref(db, `task${task}/user-${user.user_id}`));
      const taskSnapshot = await get(taskref);

      if (taskSnapshot) {
        for (let sesh = 0; sesh < user.session; ++sesh) {
          const iterationValues: TaskIteration[] = Object.values(
            taskSnapshot.val()[`session-${sesh}`]
          );

          const allKeyDowns = iterationValues
            .map((iterationValue) => {
              return iterationValue.keystroke_list;
            })
            .flat(1)
            .filter((keystroke) => keystroke.type === "keydown");

          const iterations = iterationValues.map((iterationValue) => {
            return {
              start: iterationValue.start_time,
              end: iterationValue.end_time,
            };
          });

          try {
            for (const [iterationNumber, iteration] of iterations.entries()) {
              let iterationKeyDowns = allKeyDowns.filter(
                (keyDown) =>
                  keyDown.globalTimeStamp > iteration.start &&
                  keyDown.globalTimeStamp <= iteration.end + 1000
              );

              let backspaceCount = 0;

              for (
                let keystroke = 0;
                keystroke < iterationKeyDowns.length;
                keystroke++
              ) {
                try {
                  if (iterationKeyDowns[keystroke].key === "Backspace") {
                    backspaceCount++;
                  }
                } catch (e) {
                  // correct later
                  break;
                }
              }

              const acc =
                (iterationKeyDowns.length - backspaceCount) /
                iterationKeyDowns.length;

              recordArray.push([
                user.user_id,
                sesh,
                task,
                iterationNumber,
                acc,
              ]);
            }
          } catch (e) {
            console.log(e);
          }
        }
      }
    }
  }

  let label: any[] = ["user", "session", "task", "iteration", "accuracy"];

  recordArray.unshift(label);

  console.log(recordArray);

  const csvContent = recordArray
    .map((row) => row.map((item) => `"${item}"`).join(","))
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;

  a.download = `accuracy_task${task}.csv`;
  a.click();
};

const keyPreference = async ({ task }: temporal_props) => {
  // pref
  const recordArray: any[] = [];

  if (userList) {
    for (const user of userList) {
      const taskref = query(ref(db, `task${task}/user-${user.user_id}`));
      const taskSnapshot = await get(taskref);

      if (taskSnapshot) {
        for (let sesh = 0; sesh < user.session; ++sesh) {
          const iterationValues: TaskIteration[] = Object.values(
            taskSnapshot.val()[`session-${sesh}`]
          );

          const allKeyDowns = iterationValues
            .map((iterationValue) => {
              return iterationValue.keystroke_list;
            })
            .flat(1)
            .filter((keystroke) => keystroke.type === "keydown");

          const iterations = iterationValues.map((iterationValue) => {
            return {
              start: iterationValue.start_time,
              end: iterationValue.end_time,
            };
          });

          try {
            for (const [iterationNumber, iteration] of iterations.entries()) {
              let iterationKeyDowns = allKeyDowns.filter(
                (keyDown) =>
                  keyDown.globalTimeStamp > iteration.start &&
                  keyDown.globalTimeStamp <= iteration.end + 1000
              );

              let shiftLeftCount = 0;
              let shiftRightCount = 0;
              let capsLockCount = 0;
              let capitalisationCount = 0;
              for (
                let keystroke = 0;
                keystroke < iterationKeyDowns.length;
                keystroke++
              ) {
                try {
                  if (iterationKeyDowns[keystroke].key === "Shift") {
                    capitalisationCount++;
                    if (iterationKeyDowns[keystroke].location === 1) {
                      shiftLeftCount++;
                    }
                    if (iterationKeyDowns[keystroke].location === 2) {
                      shiftRightCount++;
                    }
                  }
                  if (iterationKeyDowns[keystroke].key === "CapsLock") {
                    capsLockCount = 1;
                  }
                } catch (e) {
                  // correct later
                  break;
                }
              }
              if (capitalisationCount === 0) {
                // making sure it's never zero
                capitalisationCount = 1;
              }
              const shiftRightPrec = shiftRightCount / capitalisationCount;
              const shiftLeftPrec = shiftLeftCount / capitalisationCount;
              const capsLockPrec = capsLockCount;

              recordArray.push([
                user.user_id,
                sesh,
                task,
                iterationNumber,
                shiftRightPrec,
                shiftLeftPrec,
                capsLockPrec,
              ]);
            }
          } catch (e) {
            console.log(e);
          }
        }
      }
    }
  }

  let label: any[] = [
    "user",
    "session",
    "task",
    "iteration",
    "shiftRight",
    "shiftLeft",
    "capsLock",
  ];

  recordArray.unshift(label);

  console.log(recordArray);

  const csvContent = recordArray
    .map((row) => row.map((item) => `"${item}"`).join(","))
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;

  a.download = `keyPreference_task${task}.csv`;
  a.click();
};

const reactionTime = async ({ task }: temporal_props) => {
  const recordArray: any[] = [];

  if (userList) {
    for (const user of userList) {
      const taskref = query(ref(db, `task${task}/user-${user.user_id}`));
      const taskSnapshot = await get(taskref);

      if (taskSnapshot) {
        for (let sesh = 0; sesh < user.session; ++sesh) {
          const iterationValues: TaskIteration[] = Object.values(
            taskSnapshot.val()[`session-${sesh}`]
          );

          const allKeyDowns = iterationValues
            .map((iterationValue) => {
              return iterationValue.keystroke_list;
            })
            .flat(1)
            .filter((keystroke) => keystroke.type === "keydown");

          const iterations = iterationValues.map((iterationValue) => {
            return {
              start: iterationValue.start_time,
              end: iterationValue.end_time,
            };
          });

          let reactionTimeArray: number[] = [];
          // get all reaction times for all sessions
          // normalise them
          // take non-zero values from normalised reaction times
          // get average
          // fill zero values with average
          try {
            for (const [iterationNumber, iteration] of iterations.entries()) {
              let iterationKeyDowns = allKeyDowns.filter(
                (keyDown) =>
                  keyDown.globalTimeStamp > iteration.start &&
                  keyDown.globalTimeStamp <= iteration.end + 1000
              );

              let reactionTime: number = 0;
              if (iterationValues) {
                reactionTime =
                  iterationKeyDowns[0].globalTimeStamp -
                  (iterationValues[iterationNumber].start_time +
                    iterationValues[iterationNumber].reaction_latency);
                reactionTimeArray.push(reactionTime);
              }
              // recordArray.push([user.user_id, sesh, task, reactionTime]);
            }
            // at this point array is full
            const meanReactionTime =
              reactionTimeArray.reduce((acc, val) => acc + val, 0) /
              reactionTimeArray.length;
            const stDevReactionTime = Math.sqrt(
              reactionTimeArray
                .map((x) => Math.pow(x - meanReactionTime, 2))
                .reduce((a, b) => a + b) / reactionTimeArray.length
            );
            const filteredReactionTimeArray = reactionTimeArray.filter(
              (value) => {
                const zScore = (value - meanReactionTime) / stDevReactionTime;
                return Math.abs(zScore) <= 1 && value > 0;
              }
            );

            const filteredAverage =
              filteredReactionTimeArray.reduce((sm, a) => sm + a, 0) /
              filteredReactionTimeArray.length;

            reactionTimeArray = reactionTimeArray.map((value) =>
              Math.abs((value - meanReactionTime) / stDevReactionTime) <= 1 &&
              value > 0
                ? value
                : filteredAverage
            );

            for (const [iterationNumber] of iterations.entries()) {
              recordArray.push([
                user.user_id,
                sesh,
                task,
                iterationNumber,
                reactionTimeArray[iterationNumber],
              ]);
            }
            console.log(reactionTimeArray);
          } catch (e) {
            console.log(e);
          }
        }
      }
    }
  }

  let label: any[] = ["user", "session", "task", "iteration", "reactionTime"];

  recordArray.unshift(label);

  console.log(recordArray);

  const csvContent = recordArray
    .map((row) => row.map((item) => `"${item}"`).join(","))
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;

  a.download = `reaction_task${task}.csv`;
  a.click();
};

const task3Features = async () => {
  const recordArray: any[] = [];

  if (userList) {
    for (const user of userList) {
      const taskref = query(ref(db, `task3/user-${user.user_id}`));
      const taskSnapshot = await get(taskref);

      if (taskSnapshot) {
        for (let sesh = 0; sesh < user.session; ++sesh) {
          const iterationValues: TaskIteration[] = Object.values(
            taskSnapshot.val()[`session-${sesh}`]
          );

          const allKeyDowns = iterationValues
            .map((iterationValue) => {
              return iterationValue.keystroke_list;
            })
            .flat(1)
            .filter((keystroke) => keystroke.type === "keydown");

          const allKeyUps = iterationValues
            .map((iterationValue) => {
              return iterationValue.keystroke_list;
            })
            .flat(1)
            .filter((keystroke) => keystroke.type === "keyup");

          try {
            // averages of most popular letters
            let E_list_down: KeyDown[] = [];
            let A_list_down: KeyDown[] = [];
            let T_list_down: KeyDown[] = [];
            let O_list_down: KeyDown[] = [];
            let I_list_down: KeyDown[] = [];
            let N_list_down: KeyDown[] = [];
            let S_list_down: KeyDown[] = [];
            let R_list_down: KeyDown[] = [];
            let L_list_down: KeyDown[] = [];

            let E_list_up: KeyUp[] = [];
            let A_list_up: KeyUp[] = [];
            let T_list_up: KeyUp[] = [];
            let O_list_up: KeyUp[] = [];
            let I_list_up: KeyUp[] = [];
            let N_list_up: KeyUp[] = [];
            let S_list_up: KeyUp[] = [];
            let R_list_up: KeyUp[] = [];
            let L_list_up: KeyUp[] = [];

            let E_list_H: number[] = [];
            let A_list_H: number[] = [];
            let T_list_H: number[] = [];
            let O_list_H: number[] = [];
            let I_list_H: number[] = [];
            let N_list_H: number[] = [];
            let S_list_H: number[] = [];
            let R_list_H: number[] = [];
            let L_list_H: number[] = [];

            for (let idx = 0; idx < allKeyDowns.length; idx++) {
              if (
                allKeyDowns[idx].key === "e" ||
                allKeyDowns[idx].code === "KEY_E"
              ) {
                E_list_down.push(allKeyDowns[idx]);
              }
              if (
                allKeyDowns[idx].key === "a" ||
                allKeyDowns[idx].code === "KEY_A"
              ) {
                A_list_down.push(allKeyDowns[idx]);
              }
              if (
                allKeyDowns[idx].key === "t" ||
                allKeyDowns[idx].code === "KEY_t"
              ) {
                T_list_down.push(allKeyDowns[idx]);
              }
              if (
                allKeyDowns[idx].key === "o" ||
                allKeyDowns[idx].code === "KEY_O"
              ) {
                O_list_down.push(allKeyDowns[idx]);
              }
              if (
                allKeyDowns[idx].key === "i" ||
                allKeyDowns[idx].code === "KEY_I"
              ) {
                I_list_down.push(allKeyDowns[idx]);
              }
              if (
                allKeyDowns[idx].key === "n" ||
                allKeyDowns[idx].code === "KEY_N"
              ) {
                N_list_down.push(allKeyDowns[idx]);
              }
              if (
                allKeyDowns[idx].key === "s" ||
                allKeyDowns[idx].code === "KEY_S"
              ) {
                S_list_down.push(allKeyDowns[idx]);
              }
              if (
                allKeyDowns[idx].key === "r" ||
                allKeyDowns[idx].code === "KEY_R"
              ) {
                R_list_down.push(allKeyDowns[idx]);
              }
              if (
                allKeyDowns[idx].key === "l" ||
                allKeyDowns[idx].code === "KEY_L"
              ) {
                L_list_down.push(allKeyDowns[idx]);
              }
            }

            for (let idx = 0; idx < allKeyUps.length; idx++) {
              if (
                allKeyUps[idx].key === "e" ||
                allKeyUps[idx].code === "KEY_E"
              ) {
                E_list_up.push(allKeyUps[idx]);
              }
              if (
                allKeyUps[idx].key === "a" ||
                allKeyUps[idx].code === "KEY_A"
              ) {
                A_list_up.push(allKeyUps[idx]);
              }
              if (
                allKeyUps[idx].key === "t" ||
                allKeyUps[idx].code === "KEY_t"
              ) {
                T_list_up.push(allKeyUps[idx]);
              }
              if (
                allKeyUps[idx].key === "o" ||
                allKeyUps[idx].code === "KEY_O"
              ) {
                O_list_up.push(allKeyUps[idx]);
              }
              if (
                allKeyUps[idx].key === "i" ||
                allKeyUps[idx].code === "KEY_I"
              ) {
                I_list_up.push(allKeyUps[idx]);
              }
              if (
                allKeyUps[idx].key === "n" ||
                allKeyUps[idx].code === "KEY_N"
              ) {
                N_list_up.push(allKeyUps[idx]);
              }
              if (
                allKeyUps[idx].key === "s" ||
                allKeyUps[idx].code === "KEY_S"
              ) {
                S_list_up.push(allKeyUps[idx]);
              }
              if (
                allKeyUps[idx].key === "r" ||
                allKeyUps[idx].code === "KEY_R"
              ) {
                R_list_up.push(allKeyUps[idx]);
              }
              if (
                allKeyUps[idx].key === "l" ||
                allKeyUps[idx].code === "KEY_L"
              ) {
                L_list_up.push(allKeyUps[idx]);
              }
            }

            for (
              let idx = 0;
              idx < Math.min(E_list_up.length, E_list_down.length);
              idx++
            ) {
              E_list_H.push(
                E_list_up[idx].globalTimeStamp -
                  E_list_down[idx].globalTimeStamp
              );
            }
            for (
              let idx = 0;
              idx < Math.min(A_list_up.length, A_list_down.length);
              idx++
            ) {
              A_list_H.push(
                A_list_up[idx].globalTimeStamp -
                  A_list_down[idx].globalTimeStamp
              );
            }
            for (
              let idx = 0;
              idx < Math.min(T_list_up.length, T_list_down.length);
              idx++
            ) {
              T_list_H.push(
                T_list_up[idx].globalTimeStamp -
                  T_list_down[idx].globalTimeStamp
              );
            }
            for (
              let idx = 0;
              idx < Math.min(O_list_up.length, O_list_down.length);
              idx++
            ) {
              O_list_H.push(
                O_list_up[idx].globalTimeStamp -
                  O_list_down[idx].globalTimeStamp
              );
            }
            for (
              let idx = 0;
              idx < Math.min(I_list_up.length, I_list_down.length);
              idx++
            ) {
              I_list_H.push(
                I_list_up[idx].globalTimeStamp -
                  I_list_down[idx].globalTimeStamp
              );
            }
            for (
              let idx = 0;
              idx < Math.min(N_list_up.length, N_list_down.length);
              idx++
            ) {
              N_list_H.push(
                N_list_up[idx].globalTimeStamp -
                  N_list_down[idx].globalTimeStamp
              );
            }
            for (
              let idx = 0;
              idx < Math.min(S_list_up.length, S_list_down.length);
              idx++
            ) {
              S_list_H.push(
                S_list_up[idx].globalTimeStamp -
                  S_list_down[idx].globalTimeStamp
              );
            }
            for (
              let idx = 0;
              idx < Math.min(R_list_up.length, R_list_down.length);
              idx++
            ) {
              R_list_H.push(
                R_list_up[idx].globalTimeStamp -
                  R_list_down[idx].globalTimeStamp
              );
            }
            for (
              let idx = 0;
              idx < Math.min(L_list_up.length, L_list_down.length);
              idx++
            ) {
              L_list_H.push(
                L_list_up[idx].globalTimeStamp -
                  L_list_down[idx].globalTimeStamp
              );
            }

            // average pause between words

            let arrayOfDowns: [KeyDown, number][] = allKeyDowns.map((c, i) => [
              c,
              i,
            ]);

            const arrayOfSpaceDowns = arrayOfDowns.filter(
              (i) => i[0].code === "Space" && i[0].key === " "
            );
            let arrayOfUps: [KeyUp, number][] = allKeyUps.map((c, i) => [c, i]);
            const arrayOfSpaceUps = arrayOfUps.filter(
              (i) => i[0].code === "Space" && i[0].key === " "
            );
            let spaceList: number[] = [];

            for (let idx = 0; idx < arrayOfSpaceDowns.length; idx++) {
              const keyBeforeSpace = allKeyUps[arrayOfSpaceDowns[idx][1] - 1];
              const keyAfterSpace = allKeyDowns[arrayOfSpaceUps[idx][1] + 1];
              spaceList.push(
                keyAfterSpace.globalTimeStamp - keyBeforeSpace.globalTimeStamp
              );
            }

            // average typing speed

            const totalWords = allKeyDowns.length / 5;
            const minutes =
              (allKeyDowns[allKeyDowns.length - 1].globalTimeStamp -
                allKeyDowns[0].globalTimeStamp) /
              60000;

            const speed = totalWords / minutes;

            let backspaceCount = 0;

            for (
              let keystroke = 0;
              keystroke < allKeyDowns.length;
              keystroke++
            ) {
              try {
                if (allKeyDowns[keystroke].key === "Backspace") {
                  backspaceCount++;
                }
              } catch (e) {
                // correct later
                break;
              }
            }

            // typing accuracy

            const accuracy =
              (allKeyDowns.length - backspaceCount) / allKeyDowns.length;

            // key preference for shift keys and capslock

            let shiftLeftCount = 0;
            let shiftRightCount = 0;
            let capsLockCount = 0;
            let capitalisationCount = 0;
            for (
              let keystroke = 0;
              keystroke < allKeyDowns.length;
              keystroke++
            ) {
              try {
                if (allKeyDowns[keystroke].key === "Shift") {
                  capitalisationCount++;
                  if (allKeyDowns[keystroke].location === 1) {
                    shiftLeftCount++;
                  }
                  if (allKeyDowns[keystroke].location === 2) {
                    shiftRightCount++;
                  }
                }
                if (allKeyDowns[keystroke].key === "CapsLock") {
                  capsLockCount = 1;
                }
              } catch (e) {
                // correct later
                break;
              }
            }
            if (capitalisationCount === 0) {
              // making sure it's never zero
              capitalisationCount = 1;
            }

            const shiftRightPrec = shiftRightCount / capitalisationCount;
            const shiftLeftPrec = shiftLeftCount / capitalisationCount;
            const capsLockPrec = capsLockCount;

            // comma count

            let commacount = 0;

            for (
              let keystroke = 0;
              keystroke < allKeyDowns.length;
              keystroke++
            ) {
              try {
                if (
                  allKeyDowns[keystroke].key === "," ||
                  allKeyDowns[keystroke].code === "Comma"
                ) {
                  commacount++;
                }
              } catch (e) {
                // correct later
                break;
              }
            }
            const avg_E = E_list_H.reduce((a, b) => a + b) / E_list_H.length;
            const avg_A = A_list_H.reduce((a, b) => a + b) / A_list_H.length;
            const avg_T = T_list_H.reduce((a, b) => a + b) / T_list_H.length;
            const avg_O = O_list_H.reduce((a, b) => a + b) / O_list_H.length;
            const avg_I = I_list_H.reduce((a, b) => a + b) / I_list_H.length;
            const avg_N = N_list_H.reduce((a, b) => a + b) / N_list_H.length;
            const avg_S = S_list_H.reduce((a, b) => a + b) / S_list_H.length;
            const avg_R = R_list_H.reduce((a, b) => a + b) / R_list_H.length;
            const avg_L = L_list_H.reduce((a, b) => a + b) / L_list_H.length;

            const avgPause =
              spaceList.reduce((a, b) => a + b) / spaceList.length;
            // full record
            recordArray.push([
              user.user_id,
              avg_E,
              avg_A,
              avg_T,
              avg_O,
              avg_I,
              avg_N,
              avg_S,
              avg_R,
              avg_L,
              speed,
              avgPause,
              accuracy,
              shiftLeftPrec,
              shiftRightPrec,
              capsLockPrec,
              commacount,
            ]);
          } catch (e) {
            console.log(e);
          }
        }
      }
    }
  }

  let label: any[] = [
    "user",
    "mean_E_value",
    "mean_A_value",
    "mean_T_value",
    "mean_O_value",
    "mean_I_value",
    "mean_N_value",
    "mean_S_value",
    "mean_R_value",
    "mean_L_value",
    "avg_typing_speed",
    "avg_pause_time",
    "free_typing_accuracy",
    "shiftLeft",
    "shiftRight",
    "CapsLock",
    "CommaCount",
  ];

  recordArray.unshift(label);

  console.log(recordArray);

  const csvContent = recordArray
    .map((row) => row.map((item) => `"${item}"`).join(","))
    .join("\n");

  const blob = new Blob([csvContent], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;

  a.download = `task3_features.csv`;
  a.click();
};

const Home = () => {
  // session 2s and 3s included
  // a file containing data for each task of a particular session
  // temporal features correspond to letters
  // for quick brown fox jumps over the lazy dog - UD_q UD_u UD_i UD_c ... etc
  // example of a record: user ID, task, session, UD_q, UD_u, UD_i, UD_c, UD_k ...
  // so 30 or 20 records for each user per task

  return (
    <div className="section">
      <button type="button" onClick={fetchUsers}>
        Users
      </button>
      <div>
        <h1>Task 3</h1>
        <button onClick={() => task3Features()}>Task3</button>
        <h1>Temporal</h1>
        <h2>UD</h2>
        <button onClick={() => UD({ task: "1" })}>Task1</button>
        <button onClick={() => UD({ task: "2a" })}>Task2a</button>
        <button onClick={() => UD({ task: "2b" })}>Task2b</button>
        <button onClick={() => UD({ task: "2c" })}>Task2c</button>
        <h2>DU</h2>
        <button onClick={() => DU({ task: "1" })}>Task1</button>
        <button onClick={() => DU({ task: "2a" })}>Task2a</button>
        <button onClick={() => DU({ task: "2b" })}>Task2b</button>
        <button onClick={() => DU({ task: "2c" })}>Task2c</button>
        <h2>DD</h2>
        <button onClick={() => DD({ task: "1" })}>Task1</button>
        <button onClick={() => DD({ task: "2a" })}>Task2a</button>
        <button onClick={() => DD({ task: "2b" })}>Task2b</button>
        <button onClick={() => DD({ task: "2c" })}>Task2c</button>
        <h2>UU</h2>
        <button onClick={() => UU({ task: "1" })}>Task1</button>
        <button onClick={() => UU({ task: "2a" })}>Task2a</button>
        <button onClick={() => UU({ task: "2b" })}>Task2b</button>
        <button onClick={() => UU({ task: "2c" })}>Task2c</button>
        <h2>UU negative</h2>
        <button onClick={() => negUU({ task: "1" })}>Task1</button>
        <button onClick={() => negUU({ task: "2a" })}>Task2a</button>
        <button onClick={() => negUU({ task: "2b" })}>Task2b</button>
        <button onClick={() => negUU({ task: "2c" })}>Task2c</button>
        <h2>UD negative</h2>
        <button onClick={() => negUD({ task: "1" })}>Task1</button>
        <button onClick={() => negUD({ task: "2a" })}>Task2a</button>
        <button onClick={() => negUD({ task: "2b" })}>Task2b</button>
        <button onClick={() => negUD({ task: "2c" })}>Task2c</button>
        <h2>UD and statistics</h2>
        <button onClick={() => UD({ task: "1", statistical: true })}>
          task1
        </button>
        <button onClick={() => UD({ task: "2a", statistical: true })}>
          task2a
        </button>
        <button onClick={() => UD({ task: "2b", statistical: true })}>
          task2b
        </button>
        <button onClick={() => UD({ task: "2c", statistical: true })}>
          task2c
        </button>
        <h2>DU and statistics</h2>
        <button onClick={() => DU({ task: "1", statistical: true })}>
          Task1
        </button>
        <button onClick={() => DU({ task: "2a", statistical: true })}>
          Task2a
        </button>
        <button onClick={() => DU({ task: "2b", statistical: true })}>
          Task2b
        </button>
        <button onClick={() => DU({ task: "2c", statistical: true })}>
          Task2c
        </button>
        <h2>UU and statistics</h2>
        <button onClick={() => UU({ task: "1", statistical: true })}>
          Task1
        </button>
        <button onClick={() => UU({ task: "2a", statistical: true })}>
          Task2a
        </button>
        <button onClick={() => UU({ task: "2b", statistical: true })}>
          Task2b
        </button>
        <button onClick={() => UU({ task: "2c", statistical: true })}>
          Task2c
        </button>
        <h2>DD and statistics</h2>
        <button onClick={() => DD({ task: "1", statistical: true })}>
          Task1
        </button>
        <button onClick={() => DD({ task: "2a", statistical: true })}>
          Task2a
        </button>
        <button onClick={() => DD({ task: "2b", statistical: true })}>
          Task2b
        </button>
        <button onClick={() => DD({ task: "2c", statistical: true })}>
          Task2c
        </button>
        <h2>digraph</h2>
        <button onClick={() => digraph({ task: "1" })}>Task1</button>
        <button onClick={() => digraph({ task: "2a" })}>Task2a</button>
        <button onClick={() => digraph({ task: "2b" })}>Task2b</button>
        <button onClick={() => digraph({ task: "2c" })}>Task2c</button>
        <h2>digraph and statistics</h2>
        <button onClick={() => digraph({ task: "1", statistical: true })}>
          Task1
        </button>
        <button onClick={() => digraph({ task: "2a", statistical: true })}>
          Task2a
        </button>
        <button onClick={() => digraph({ task: "2b", statistical: true })}>
          Task2b
        </button>
        <button onClick={() => digraph({ task: "2c", statistical: true })}>
          Task2c
        </button>
        <h2>trigraph</h2>
        <button onClick={() => trigraph({ task: "1" })}>Task1</button>
        <button onClick={() => trigraph({ task: "2a" })}>Task2a</button>
        <button onClick={() => trigraph({ task: "2b" })}>Task2b</button>
        <button onClick={() => trigraph({ task: "2c" })}>Task2c</button>
        <h2>trigraph and statistics</h2>
        <button onClick={() => trigraph({ task: "1", statistical: true })}>
          Task1
        </button>
        <button onClick={() => trigraph({ task: "2a", statistical: true })}>
          Task2a
        </button>
        <button onClick={() => trigraph({ task: "2b", statistical: true })}>
          Task2b
        </button>
        <button onClick={() => trigraph({ task: "2c", statistical: true })}>
          Task2c
        </button>

        <h1>Non-temporal</h1>

        <h2>Typing speed</h2>
        <button onClick={() => typingSpeed({ task: "1" })}>Task1</button>
        <button onClick={() => typingSpeed({ task: "2a" })}>Task2a</button>
        <button onClick={() => typingSpeed({ task: "2b" })}>Task2b</button>
        <button onClick={() => typingSpeed({ task: "2c" })}>Task2c</button>

        <h2>Key preference</h2>
        <button onClick={() => keyPreference({ task: "1" })}>Task1</button>
        <button onClick={() => keyPreference({ task: "2a" })}>Task2a</button>
        <button onClick={() => keyPreference({ task: "2b" })}>Task2b</button>
        <button onClick={() => keyPreference({ task: "2c" })}>Task2c</button>

        <h2>Typing accuracy</h2>
        <button onClick={() => accuracy({ task: "1" })}>Task1</button>
        <button onClick={() => accuracy({ task: "2a" })}>Task2a</button>
        <button onClick={() => accuracy({ task: "2b" })}>Task2b</button>
        <button onClick={() => accuracy({ task: "2c" })}>Task2c</button>

        <h2>Reaction time</h2>
        <button onClick={() => reactionTime({ task: "1" })}>task1</button>
        <button onClick={() => reactionTime({ task: "2a" })}>task2a</button>
        <button onClick={() => reactionTime({ task: "2b" })}>task2b</button>
        <button onClick={() => reactionTime({ task: "2c" })}>task2c</button>
      </div>
    </div>
  );
};

export { Home, fetchUsers };
