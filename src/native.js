// Native bridge for the Android build.
// The original page relies on three browser-only behaviours that don't work inside
// an Android WebView: <a download> file saves, window.print(), and the Esc key.
// This file swaps them for native equivalents. In a normal browser it does nothing.
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { App } from '@capacitor/app';

if (Capacitor.isNativePlatform()) {
  /* ---------- 1. Backup export: write to cache, then open the Android share sheet ---------- */
  window.exportJsonFile = async function exportJsonFile() {
    try {
      const payload = {
        app: 'ChronoSprintPro',
        version: '3.0',
        exportDate: getTodayDMY(),
        subjects: appState.subjects,
        topics: appState.topics
      };
      const fileName = `chronosprint_backup_${getTodayDMY().replace(/\//g, '-')}.json`;

      await Filesystem.writeFile({
        path: fileName,
        data: JSON.stringify(payload, null, 2),
        directory: Directory.Cache,
        encoding: Encoding.UTF8
      });
      const { uri } = await Filesystem.getUri({ path: fileName, directory: Directory.Cache });

      await Share.share({
        title: 'ChronoSprint backup',
        files: [uri],
        dialogTitle: 'Save your backup (Drive, Files, WhatsApp, email…)'
      });
      showToast('Backup ready!');
    } catch (err) {
      // Dismissing the share sheet throws on some Android versions; don't show that as an error.
      if (!/cancel|dismiss/i.test(String(err && err.message))) {
        console.error(err);
        showToast('Could not create backup.', false);
      }
    }
  };

  // The file picker is more reliable on Android without an extension filter;
  // handleImportFile() already validates the JSON itself.
  const importInput = document.getElementById('importFileInput');
  if (importInput) importInput.removeAttribute('accept');

  /* ---------- 2. Print → share today's checklist as text ---------- */
  window.printDailyAgendaSheet = async function shareDailySheet() {
    try {
      const today = getTodayDMY();
      const data = buildRepetitionIndex()[today] || { originals: [], revisions: [] };
      const lines = [`ChronoSprint — Daily revision checklist`, `Date: ${today}`, ''];

      lines.push('SCHEDULED REPETITIONS DUE TODAY');
      if (!data.revisions.length) lines.push('  (none)');
      data.revisions.forEach((r) => {
        const unit = typeof r.interval === 'number' ? 'd' : '';
        lines.push(`☐ [+${r.interval}${unit}] ${r.topicTitle} (${r.subject} • learned ${r.originalDate})`);
        if (r.topicNotes) lines.push(`    Notes: ${r.topicNotes}`);
      });

      lines.push('', 'TOPICS FIRST STUDIED TODAY');
      if (!data.originals.length) lines.push('  (none)');
      data.originals.forEach((t) => {
        lines.push(`☐ ${t.title} (${t.subject})`);
        if (t.notes) lines.push(`    Notes: ${t.notes}`);
      });

      await Share.share({
        title: `Revision checklist ${today}`,
        text: lines.join('\n'),
        dialogTitle: 'Share today’s checklist'
      });
    } catch (err) {
      if (!/cancel|dismiss/i.test(String(err && err.message))) {
        console.error(err);
        showToast('Could not share checklist.', false);
      }
    }
  };
  document.querySelectorAll('[onclick="printDailyAgendaSheet()"]').forEach((b) => {
    b.title = "Share today's revision checklist";
  });

  /* ---------- 3. Hardware / gesture back button ---------- */
  const MODALS = [
    ['modalManageSubjects', 'closeManageSubjectsModal'],
    ['modalAddTopic', 'closeAddTopicModal'],
    ['modalDayInspector', 'closeDayInspectorModal'],
    ['modalEditTopic', 'closeEditTopicModal'],
    ['modalBackup', 'closeBackupModal'],
    ['modalShortcuts', 'closeShortcutsModal']
  ];

  App.addListener('backButton', () => {
    // 1) close whichever modal is open
    for (const [id, closer] of MODALS) {
      const el = document.getElementById(id);
      if (el && !el.classList.contains('hidden')) {
        if (typeof window[closer] === 'function') window[closer]();
        return;
      }
    }
    // 2) leave Today's Focus / All Topics and go back to the calendar
    if (appState.activeView !== 'calendar') {
      switchView('calendar');
      return;
    }
    // 3) otherwise exit the app
    App.exitApp();
  });
}
