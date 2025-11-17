import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ClassSummary, ClassSyllabus, UserProfile } from '../types';
import { fetchClasses, getClassSyllabus } from '../api';

interface AppContextValue {
  initializing: boolean;
  token: string | null;
  user: UserProfile | null;
  setSession: (token: string, user: UserProfile) => Promise<void>;
  logout: () => Promise<void>;
  classes: ClassSummary[];
  setClasses: React.Dispatch<React.SetStateAction<ClassSummary[]>>;
  refreshClasses: () => Promise<ClassSummary[] | void>;
  selectedClassId: number | null;
  selectClass: (classId: number | null) => Promise<void>;
  syllabusCache: Record<number, ClassSyllabus | undefined>;
  fetchSyllabusForClass: (classId: number) => Promise<ClassSyllabus | null>;
  skipMap: Record<number, boolean>;
  setSkipForClass: (classId: number, skip: boolean) => Promise<void>;
}

const TOKEN_KEY = '@syllabye/token';
const USER_KEY = '@syllabye/user';
const SKIP_KEY = '@syllabye/skipped';
const SELECTED_CLASS_KEY = '@syllabye/selectedClass';

const AppContext = createContext<AppContextValue | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [initializing, setInitializing] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [classes, setClasses] = useState<ClassSummary[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [syllabusCache, setSyllabusCache] = useState<Record<number, ClassSyllabus | undefined>>(
    {},
  );
  const [skipMap, setSkipMap] = useState<Record<number, boolean>>({});

  useEffect(() => {
    const loadPersisted = async () => {
      try {
        const [storedToken, storedUser, storedSkip, storedClass] = await Promise.all([
          AsyncStorage.getItem(TOKEN_KEY),
          AsyncStorage.getItem(USER_KEY),
          AsyncStorage.getItem(SKIP_KEY),
          AsyncStorage.getItem(SELECTED_CLASS_KEY),
        ]);
        if (storedToken) {
          setToken(storedToken);
        }
        if (storedUser) {
          try {
            const parsed = JSON.parse(storedUser);
            setUser(parsed);
          } catch {
            // ignore parsing issues
          }
        }
        if (storedSkip) {
          try {
            const parsedSkip = JSON.parse(storedSkip);
            setSkipMap(parsedSkip || {});
          } catch {
            // ignore parsing issues
          }
        }
        if (storedClass) {
          const parsedId = Number(storedClass);
          if (!Number.isNaN(parsedId)) {
            setSelectedClassId(parsedId);
          }
        }
      } finally {
        setInitializing(false);
      }
    };
    loadPersisted();
  }, []);

  const setSession = useCallback(async (nextToken: string, nextUser: UserProfile) => {
    await AsyncStorage.setItem(TOKEN_KEY, nextToken);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    setToken(nextToken);
    setUser(nextUser);
  }, []);

  const logout = useCallback(async () => {
    await Promise.all([
      AsyncStorage.removeItem(TOKEN_KEY),
      AsyncStorage.removeItem(USER_KEY),
      AsyncStorage.removeItem(SELECTED_CLASS_KEY),
    ]);
    setToken(null);
    setUser(null);
    setClasses([]);
    setSelectedClassId(null);
    setSyllabusCache({});
  }, []);

  const refreshClasses = useCallback(async () => {
    if (!token) {
      setClasses([]);
      return;
    }
    const data = await fetchClasses(token);
    setClasses(data);
    setSelectedClassId((currentId) => {
      if (!data.length) {
        AsyncStorage.removeItem(SELECTED_CLASS_KEY).catch(() => null);
        return null;
      }
      const stillExists = currentId && data.some((cls) => cls.id === currentId);
      if (stillExists) {
        return currentId;
      }
      const nextId = data[0]?.id ?? null;
      if (nextId) {
        AsyncStorage.setItem(SELECTED_CLASS_KEY, String(nextId)).catch(() => null);
      }
      return nextId;
    });
    return data;
  }, [token]);

  useEffect(() => {
    if (!token) {
      setClasses([]);
      setSyllabusCache({});
      return;
    }
    refreshClasses().catch(() => {
      // swallow errors here, screens will surface them
    });
  }, [token, refreshClasses]);

  const selectClass = useCallback(async (classId: number | null) => {
    setSelectedClassId(classId);
    if (classId) {
      await AsyncStorage.setItem(SELECTED_CLASS_KEY, String(classId));
    } else {
      await AsyncStorage.removeItem(SELECTED_CLASS_KEY);
    }
  }, []);

  const fetchSyllabusForClass = useCallback(
    async (classId: number) => {
      if (!token) {
        return null;
      }
      const syllabus = await getClassSyllabus(token, classId);
      setSyllabusCache((prev) => ({
        ...prev,
        [classId]: syllabus,
      }));
      return syllabus;
    },
    [token],
  );

  const setSkipForClass = useCallback(async (classId: number, skip: boolean) => {
    let updated: Record<number, boolean> = {};
    setSkipMap((prev) => {
      const next = { ...prev };
      if (skip) {
        next[classId] = true;
      } else {
        delete next[classId];
      }
      updated = next;
      return next;
    });
    await AsyncStorage.setItem(SKIP_KEY, JSON.stringify(updated));
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      initializing,
      token,
      user,
      setSession,
      logout,
      classes,
      setClasses,
      refreshClasses,
      selectedClassId,
      selectClass,
      syllabusCache,
      fetchSyllabusForClass,
      skipMap,
      setSkipForClass,
    }),
    [
      initializing,
      token,
      user,
      setSession,
      logout,
      classes,
      refreshClasses,
      selectedClassId,
      selectClass,
      syllabusCache,
      fetchSyllabusForClass,
      skipMap,
      setSkipForClass,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
