import React from "react";

import "./section.css";
import "./section.css";
import { getDatabase, ref, query, get } from "firebase/database";
import { UserProfile } from "../types/Users";
import { app } from "../firebase";
import { Task, TaskIteration } from "../types/Tasks";

const fetchUsers = async () => {
  const userRef = query(ref(db, `users`));
  let userList: UserProfile[] = [];
  const userSnapshot = await get(userRef);
  if (userSnapshot) {
    for (let userKey of Object.keys(userSnapshot.val())) {
      for (let userInnerKey of Object.keys(userSnapshot.val()[userKey])) {
        if (userSnapshot.val()[userKey][userInnerKey].session > 1) {
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
              end: iterationValue.end_time,
            };
          });

          try {
            for (const [iterationNumber, iteration] of iterations.entries()) {
              const records: any[] = [];
              let iterationKeyUps = allKeyUps.filter(
                (keyUp) =>
                  keyUp.timestamp > iteration.start &&
                  keyUp.timestamp <= iteration.end + 1000 &&
                  keyUp.key !== "MediaPlayPause" &&
                  keyUp.code !== "Space"
              );
              let iterationKeyDowns = allKeyDowns.filter(
                (keyDown) =>
                  keyDown.globalTimeStamp > iteration.start &&
                  keyDown.globalTimeStamp <= iteration.end + 1000 &&
                  keyDown.key !== "MediaPlayPause" &&
                  keyDown.code !== "Space"
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
                    (records.reduce(
                      (acc, val) => acc + Math.pow(val - mean, 4),
                      0
                    ) /
                      records.length) *
                    Math.pow(stDev, 4);

                  // skewness

                  const skewness =
                    (records.reduce(
                      (acc, val) => acc + Math.pow(val - mean, 3),
                      0
                    ) /
                      records.length) *
                    Math.pow(stDev, 3);

                  recordArray.push([
                    user.user_id,
                    sesh,
                    task,
                    iterationNumber,
                    ...records,
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
    label.push(`UD_${phrase.charAt(step) + phrase.charAt(step + 1)}`);
  }

  if (statistical) {
    label.push("standard_deviation", "kurtosis", "skewness");
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

  a.download = `UD_task${task}.csv`;
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
                (keyUp) =>
                  keyUp.timestamp > iteration.start &&
                  keyUp.timestamp <= iteration.end + 1000 &&
                  keyUp.key !== "MediaPlayPause" &&
                  keyUp.code !== "Space"
              );
              let iterationKeyDowns = allKeyDowns.filter(
                (keyDown) =>
                  keyDown.globalTimeStamp > iteration.start &&
                  keyDown.globalTimeStamp <= iteration.end + 1000 &&
                  keyDown.key !== "MediaPlayPause" &&
                  keyDown.code !== "Space"
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
                    (records.reduce(
                      (acc, val) => acc + Math.pow(val - mean, 4),
                      0
                    ) /
                      records.length) *
                    Math.pow(stDev, 4);

                  // skewness

                  const skewness =
                    (records.reduce(
                      (acc, val) => acc + Math.pow(val - mean, 3),
                      0
                    ) /
                      records.length) *
                    Math.pow(stDev, 3);

                  recordArray.push([
                    user.user_id,
                    sesh,
                    task,
                    iterationNumber,
                    ...records,
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
    label.push("standard_deviation", "kurtosis", "skewness");
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

  a.download = `DU_task${task}.csv`;
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
                (keyUp) =>
                  keyUp.timestamp > iteration.start &&
                  keyUp.timestamp <= iteration.end + 1000 &&
                  keyUp.key !== "MediaPlayPause" &&
                  keyUp.code !== "Space"
              );

              for (let step = 0; step < phrase.length - 1; step++) {
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
                    (records.reduce(
                      (acc, val) => acc + Math.pow(val - mean, 4),
                      0
                    ) /
                      records.length) *
                    Math.pow(stDev, 4);

                  // skewness

                  const skewness =
                    (records.reduce(
                      (acc, val) => acc + Math.pow(val - mean, 3),
                      0
                    ) /
                      records.length) *
                    Math.pow(stDev, 3);

                  recordArray.push([
                    user.user_id,
                    sesh,
                    task,
                    iterationNumber,
                    ...records,
                    stDev,
                    kurtosis,
                    skewness,
                  ]);
                } else {
                  if (statistical) {
                    const mean =
                      records.reduce((acc, val) => acc + val, 0) /
                      records.length;
                    const stDev = Math.sqrt(
                      records
                        .map((x) => Math.pow(x - mean, 2))
                        .reduce((a, b) => a + b) / records.length
                    );
                    // kurtosis

                    const kurtosis =
                      (records.reduce(
                        (acc, val) => acc + Math.pow(val - mean, 4),
                        0
                      ) /
                        records.length) *
                      Math.pow(stDev, 4);

                    // skewness

                    const skewness =
                      (records.reduce(
                        (acc, val) => acc + Math.pow(val - mean, 3),
                        0
                      ) /
                        records.length) *
                      Math.pow(stDev, 3);

                    recordArray.push([
                      user.user_id,
                      sesh,
                      task,
                      iterationNumber,
                      ...records,
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
    label.push("standard_deviation", "kurtosis", "skewness");
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

  a.download = `UU_task${task}.csv`;
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
                  keyDown.globalTimeStamp <= iteration.end + 1000 &&
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
                    (records.reduce(
                      (acc, val) => acc + Math.pow(val - mean, 4),
                      0
                    ) /
                      records.length) *
                    Math.pow(stDev, 4);

                  // skewness

                  const skewness =
                    (records.reduce(
                      (acc, val) => acc + Math.pow(val - mean, 3),
                      0
                    ) /
                      records.length) *
                    Math.pow(stDev, 3);

                  recordArray.push([
                    user.user_id,
                    sesh,
                    task,
                    iterationNumber,
                    ...records,
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
    label.push("standard_deviation", "kurtosis", "skewness");
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

  a.download = `DD_task${task}.csv`;
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
                (keyUp) =>
                  keyUp.timestamp > iteration.start &&
                  keyUp.timestamp <= iteration.end + 1000 &&
                  keyUp.key !== "MediaPlayPause" &&
                  keyUp.code !== "Space"
              );
              let iterationKeyDowns = allKeyDowns.filter(
                (keyDown) =>
                  keyDown.globalTimeStamp > iteration.start &&
                  keyDown.globalTimeStamp <= iteration.end + 1000 &&
                  keyDown.key !== "MediaPlayPause" &&
                  keyDown.code !== "Space"
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
                    (records.reduce(
                      (acc, val) => acc + Math.pow(val - mean, 4),
                      0
                    ) /
                      records.length) *
                    Math.pow(stDev, 4);

                  // skewness

                  const skewness =
                    (records.reduce(
                      (acc, val) => acc + Math.pow(val - mean, 3),
                      0
                    ) /
                      records.length) *
                    Math.pow(stDev, 3);

                  recordArray.push([
                    user.user_id,
                    sesh,
                    task,
                    iterationNumber,
                    ...records,
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
      `UD_${
        phrase.charAt(step) + phrase.charAt(step + 1) + phrase.charAt(step + 2)
      }`
    );
  }

  if (statistical) {
    label.push("standard_deviation", "kurtosis", "skewness");
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

  a.download = `trigraph_task${task}.csv`;
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
              let shiftCount = 0;
              for (
                let keystroke = 0;
                keystroke < iterationKeyDowns.length;
                keystroke++
              ) {
                try {
                  if (iterationKeyDowns[keystroke].key === "Shift") {
                    shiftCount++;
                    if (iterationKeyDowns[keystroke].location === 1) {
                      shiftLeftCount++;
                    }
                    if (iterationKeyDowns[keystroke].location === 2) {
                      shiftRightCount++;
                    }
                  }
                } catch (e) {
                  // correct later
                  break;
                }
              }
              if (shiftCount === 0) {
                // making sure it's never zero
                shiftCount = 1;
              }
              const shiftRightPrec = shiftRightCount / shiftCount;
              const shiftLeftPrec = shiftLeftCount / shiftCount;

              recordArray.push([
                user.user_id,
                sesh,
                task,
                iterationNumber,
                shiftRightPrec,
                shiftLeftPrec,
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
        <h1>Task 1</h1>
        <button onClick={() => UD({ task: "1" })}>UD1</button>
        <button onClick={() => UD({ task: "1", statistical: true })}>
          UD1 stats
        </button>
        <button onClick={() => UU({ task: "1" })}>UU1</button>
        <button onClick={() => DU({ task: "1" })}>DU1</button>
        <button onClick={() => DD({ task: "1" })}>DD1</button>
        <button onClick={() => trigraph({ task: "1" })}>trigraph</button>
        <button onClick={() => typingSpeed({ task: "1" })}>speed</button>
        <button onClick={() => accuracy({ task: "1" })}>accuracy</button>
        <button onClick={() => keyPreference({ task: "1" })}>
          key preference
        </button>
        <button onClick={() => reactionTime({ task: "1" })}>
          reaction time
        </button>
        <h1>Task 2a</h1>
        <button onClick={() => UD({ task: "2a" })}>UD2a</button>
        <button onClick={() => UU({ task: "2a" })}>UU2a</button>
        <button onClick={() => DU({ task: "2a" })}>DU2a</button>
        <button onClick={() => DD({ task: "2a" })}>DD2a</button>
        <button onClick={() => trigraph({ task: "2a" })}>trigraph</button>
        <button onClick={() => typingSpeed({ task: "2a" })}>speed</button>
        <button onClick={() => accuracy({ task: "2a" })}>accuracy</button>
        <button onClick={() => reactionTime({ task: "2a" })}>
          reaction time
        </button>
        <h1>Task 2b</h1>
        <button onClick={() => UD({ task: "2b" })}>UD2b</button>
        <button onClick={() => UU({ task: "2b" })}>UU2b</button>
        <button onClick={() => DU({ task: "2b" })}>DU2b</button>
        <button onClick={() => DD({ task: "2b" })}>DD2b</button>
        <button onClick={() => trigraph({ task: "2b" })}>trigraph</button>
        <button onClick={() => typingSpeed({ task: "2b" })}>speed</button>
        <button onClick={() => accuracy({ task: "2b" })}>accuracy</button>
        <button onClick={() => reactionTime({ task: "2b" })}>
          reaction time
        </button>
        <button onClick={() => keyPreference({ task: "2b" })}>
          key preference
        </button>
        <h1>Task 2c</h1>
        <button onClick={() => UD({ task: "2c" })}>UD2c</button>
        <button onClick={() => UU({ task: "2c" })}>UU2c</button>
        <button onClick={() => DU({ task: "2c" })}>DU2c</button>
        <button onClick={() => DD({ task: "2c" })}>DD2c</button>
        <button onClick={() => trigraph({ task: "2c" })}>trigraph</button>
        <button onClick={() => typingSpeed({ task: "2c" })}>speed</button>
        <button onClick={() => accuracy({ task: "2c" })}>accuracy</button>
        <button onClick={() => reactionTime({ task: "2c" })}>
          reaction time
        </button>
      </div>
    </div>
  );
};

export { Home, fetchUsers };
