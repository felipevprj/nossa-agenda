import { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  onSnapshot,
  setDoc,
} from "firebase/firestore";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from "firebase/auth";

import type { AgendaEvent, AgendaTask, ShoppingItem } from "./types";

const firebaseConfig = {
  apiKey: "AIzaSyBtMHEMtX2yikISHF0ugdhSJP0H3JURFsY",
  authDomain: "nossa-agenda-286ba.firebaseapp.com",
  projectId: "nossa-agenda-286ba",
  storageBucket: "nossa-agenda-286ba.firebasestorage.app",
  messagingSenderId: "647011844033",
  appId: "1:647011844033:web:443aa4580e0c5d0faff940",
};

let app: ReturnType<typeof initializeApp> | null = null;
let db: ReturnType<typeof getFirestore> | null = null;
let auth: ReturnType<typeof getAuth> | null = null;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
} catch (error) {
  console.error("Falha ao iniciar Firebase:", error);
}

function getFamilyDocRef() {
  if (!db) return null;
  return doc(db, "banco-de-dados", "nossa-familia");
}

export function useAuthUser() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setIsAuthLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { user, isAuthLoading };
}

export async function entrarNaAgenda(email: string, password: string) {
  if (!auth) {
    throw new Error("Firebase Auth não foi iniciado.");
  }

  return signInWithEmailAndPassword(auth, email, password);
}

export async function sairDaAgenda() {
  if (!auth) return;
  await signOut(auth);
}

export function useAgendaSync(user: User | null) {
  const [events, setEventsState] = useState<AgendaEvent[]>([]);
  const [tasks, setTasksState] = useState<AgendaTask[]>([]);
  const [shopping, setShoppingState] = useState<ShoppingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const familyDocRef = getFamilyDocRef();

    if (!user || !familyDocRef) {
      setEventsState([]);
      setTasksState([]);
      setShoppingState([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    const unsubscribe = onSnapshot(
      familyDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();

          setEventsState(data.events || []);
          setTasksState(data.tasks || []);
          setShoppingState(data.shopping || []);
        } else {
          console.error("Documento da família não encontrado no Firestore.");
        }

        setIsLoading(false);
      },
      (error) => {
        console.error("Erro de sincronização:", error);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const setEvents = (action: React.SetStateAction<AgendaEvent[]>) => {
    setEventsState((prev) => {
      const next = typeof action === "function" ? (action as any)(prev) : action;
      const familyDocRef = getFamilyDocRef();

      if (user && familyDocRef) {
        setDoc(
          familyDocRef,
          {
            events: next,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      }

      return next;
    });
  };

  const setTasks = (action: React.SetStateAction<AgendaTask[]>) => {
    setTasksState((prev) => {
      const next = typeof action === "function" ? (action as any)(prev) : action;
      const familyDocRef = getFamilyDocRef();

      if (user && familyDocRef) {
        setDoc(
          familyDocRef,
          {
            tasks: next,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      }

      return next;
    });
  };

  const setShopping = (action: React.SetStateAction<ShoppingItem[]>) => {
    setShoppingState((prev) => {
      const next = typeof action === "function" ? (action as any)(prev) : action;
      const familyDocRef = getFamilyDocRef();

      if (user && familyDocRef) {
        setDoc(
          familyDocRef,
          {
            shopping: next,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      }

      return next;
    });
  };

  return {
    events,
    setEvents,
    tasks,
    setTasks,
    shopping,
    setShopping,
    isLoading,
  };
}