import { useState, useEffect } from "react";
import { initializeApp } from "firebase/app";
import { getFirestore, doc, onSnapshot, setDoc } from "firebase/firestore";
import type { AgendaEvent, AgendaTask, ShoppingItem } from "./types";

const firebaseConfig = {
  apiKey: "AIzaSyBtMHEMtX2yikISHF0ugdhSJP0H3JURFsY",
  authDomain: "nossa-agenda-286ba.firebaseapp.com",
  projectId: "nossa-agenda-286ba",
  storageBucket: "nossa-agenda-286ba.firebasestorage.app",
  messagingSenderId: "647011844033",
  appId: "1:647011844033:web:443aa4580e0c5d0faff940"
};

let db: any = null;
let familyDocRef: any = null;

try {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  familyDocRef = doc(db, "banco-de-dados", "nossa-familia");
} catch (error) {
  console.error("A rede bloqueou a ligação ao Firebase inicial:", error);
}

export function useAgendaSync() {
  const [events, setEventsState] = useState<AgendaEvent[]>([]);
  const [tasks, setTasksState] = useState<AgendaTask[]>([]);
  const [shopping, setShoppingState] = useState<ShoppingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!familyDocRef) {
      setIsLoading(false);
      return;
    }

    try {
      const unsubscribe = onSnapshot(familyDocRef, (docSnap: any) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setEventsState(data.events || []);
          setTasksState(data.tasks || []);
          setShoppingState(data.shopping || []);
        } else {
           setDoc(familyDocRef, { events: [], tasks: [], shopping: [] });
        }
        setIsLoading(false);
      }, (error: any) => {
         console.error("Erro de sincronização:", error);
         setIsLoading(false);
      });
      return () => unsubscribe();
    } catch (err) {
      console.error("Falha ao escutar a base de dados:", err);
      setIsLoading(false);
    }
  }, []);

  const setEvents = (action: React.SetStateAction<AgendaEvent[]>) => {
    setEventsState(prev => {
      const next = typeof action === 'function' ? (action as any)(prev) : action;
      if (familyDocRef) setDoc(familyDocRef, { events: next }, { merge: true });
      return next;
    });
  };

  const setTasks = (action: React.SetStateAction<AgendaTask[]>) => {
    setTasksState(prev => {
      const next = typeof action === 'function' ? (action as any)(prev) : action;
      if (familyDocRef) setDoc(familyDocRef, { tasks: next }, { merge: true });
      return next;
    });
  };

  const setShopping = (action: React.SetStateAction<ShoppingItem[]>) => {
    setShoppingState(prev => {
      const next = typeof action === 'function' ? (action as any)(prev) : action;
      if (familyDocRef) setDoc(familyDocRef, { shopping: next }, { merge: true });
      return next;
    });
  };

  return { events, setEvents, tasks, setTasks, shopping, setShopping, isLoading };
}