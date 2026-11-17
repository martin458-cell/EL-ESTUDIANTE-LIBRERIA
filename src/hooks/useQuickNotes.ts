import { useState, useEffect } from 'react';
import { QuickNote, QuickNoteService } from '../services/quickNoteService';

export const useQuickNotes = () => {
  const [notes, setNotes] = useState<QuickNote[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = QuickNoteService.subscribeQuickNotes((fetchedNotes) => {
      // Sort pinned first, then by date/order
      const sorted = [...fetchedNotes].sort((a, b) => {
        if (a.pinned !== b.pinned) {
          return a.pinned ? -1 : 1;
        }
        // Completed notes move towards the bottom
        if (a.completed !== b.completed) {
          return a.completed ? 1 : -1;
        }
        return 0;
      });
      setNotes(sorted);
      setLoading(false);
    });

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  return {
    notes,
    loading,
    saveNote: QuickNoteService.saveNote,
    deleteNote: QuickNoteService.deleteNote,
    togglePin: QuickNoteService.togglePin,
    toggleCompleted: QuickNoteService.toggleCompleted
  };
};
