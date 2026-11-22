import { readFile } from "node:fs/promises";
import { after, before, test } from "node:test";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, setDoc } from "firebase/firestore";

let environment;
const pathFor = (db, uid) => doc(db, "users", uid, "gradebook", "current");
const validDocument = {
  app: "15punkte",
  schemaVersion: 2,
  data: { version: 1, subjects: [], performances: [] },
  goals: [],
  preferences: {
    state: "Baden-Württemberg",
    schoolType: "Allgemeinbildendes Gymnasium",
    schoolYear: "2025/26",
    currentSemester: 1,
    theme: "light",
  },
};

before(async () => {
  environment = await initializeTestEnvironment({
    projectId: "demo-15punkte",
    firestore: {
      rules: await readFile(new URL("../firestore.rules", import.meta.url), "utf8"),
    },
  });
});

after(async () => {
  await environment?.cleanup();
});

test("a user can manage only their own well-formed gradebook", async () => {
  const alice = environment.authenticatedContext("alice").firestore();
  const bob = environment.authenticatedContext("bob").firestore();
  const aliceDocument = pathFor(alice, "alice");

  await assertSucceeds(setDoc(aliceDocument, validDocument));
  await assertSucceeds(getDoc(aliceDocument));
  await assertFails(getDoc(pathFor(bob, "alice")));
  await assertFails(setDoc(pathFor(bob, "alice"), validDocument));
  await assertFails(deleteDoc(pathFor(bob, "alice")));
  await assertSucceeds(deleteDoc(aliceDocument));
});

test("anonymous users and invalid or unexpected documents are denied", async () => {
  const anonymous = environment.unauthenticatedContext().firestore();
  const alice = environment.authenticatedContext("alice").firestore();

  await assertFails(getDoc(pathFor(anonymous, "alice")));
  await assertFails(setDoc(pathFor(alice, "alice"), { ...validDocument, admin: true }));
  await assertFails(
    setDoc(pathFor(alice, "alice"), {
      ...validDocument,
      preferences: { ...validDocument.preferences, theme: "neon" },
    }),
  );
});
