import electron from 'electron';

import { formatError } from '../renderer/src/common/common';
import { isMacOs } from '../renderer/src/common/electron';

import { mainWindow } from './index';
import { canCheckForUpdates, clearRecentFiles } from './MainWindow';

let enabledMenu: electron.Menu | null = null;
let disabledMenu: electron.Menu | null = null;
let recentFilePaths: string[] = [];
let hasFiles = false;
let canSave = false;
let canSaveAs = false;
let menuEnabled = false;
// Note: our main menu is disabled until our renderer enables it (see MainWindow's constructor).

const menuLabel = (label: string): string => {
  // Return the given label of a top-level menu with a mnemonic (i.e. its first letter, e.g., Alt+F for the File menu)
  // on Windows and Linux (macOS doesn't have mnemonics).

  return isMacOs() ? label : `&${label}`;
};

export const enableDisableMainMenu = (enable: boolean): void => {
  // Keep track of whether our menu is enabled (see updateReopenMenu()).

  menuEnabled = enable;

  // Build our menu, if needed.

  if (enable && enabledMenu) {
    electron.Menu.setApplicationMenu(enabledMenu);
  } else if (!enable && disabledMenu) {
    electron.Menu.setApplicationMenu(disabledMenu);
  } else {
    // Some common menu items.

    const settingsMenuItem: electron.MenuItemConstructorOptions = {
      label: 'Settings...',
      accelerator: 'CmdOrCtrl+,',
      click: () => {
        mainWindow?.send('settings');
      }
    };

    let checkForUpdatesMenuItem: electron.MenuItemConstructorOptions | null = null;

    if (canCheckForUpdates()) {
      checkForUpdatesMenuItem = {
        label: 'Check for Updates...',
        click: () => {
          mainWindow?.send('check-for-updates');
        }
      };
    }

    const aboutOpencorMenuItem: electron.MenuItemConstructorOptions = {
      label: 'About OpenCOR',
      click: () => {
        mainWindow?.send('about');
      }
    };

    // App menu.

    const appSubMenu: electron.MenuItemConstructorOptions[] = [];
    const appMenu: electron.MenuItemConstructorOptions = {
      label: electron.app.name,
      submenu: appSubMenu
    };

    if (isMacOs()) {
      if (enable) {
        appSubMenu.push(aboutOpencorMenuItem);

        if (checkForUpdatesMenuItem) {
          appSubMenu.push({ type: 'separator' });
          appSubMenu.push(checkForUpdatesMenuItem);
        }

        appSubMenu.push({ type: 'separator' });
        appSubMenu.push(settingsMenuItem);
        appSubMenu.push({ type: 'separator' });
      }

      appSubMenu.push({ role: 'hide' });
      appSubMenu.push({ role: 'hideOthers' });
      appSubMenu.push({ role: 'unhide' });

      if (enable) {
        appSubMenu.push({ type: 'separator' });
        appSubMenu.push({ role: 'quit' });
      }
    }

    // File menu.

    const fileSubMenu: electron.MenuItemConstructorOptions[] = [];
    const fileMenu: electron.MenuItemConstructorOptions = {
      label: menuLabel('File'),
      submenu: fileSubMenu
    };

    fileSubMenu.push({
      label: 'Open...',
      accelerator: 'CmdOrCtrl+O',
      click: () => {
        mainWindow?.showOpenDialog();
      }
    });
    fileSubMenu.push({
      label: 'Open Location...',
      accelerator: 'CmdOrCtrl+Shift+O',
      click: () => {
        mainWindow?.send('open-location');
      }
    });
    fileSubMenu.push({
      label: 'Open Sample',
      submenu: [
        {
          label: 'Lorenz',
          click: () => {
            mainWindow?.send('open-sample-lorenz');
          }
        }
      ]
    });

    const fileReopenSubMenu: electron.MenuItemConstructorOptions[] = [];

    fileReopenSubMenu.push({
      label: 'Most Recent',
      accelerator: 'CmdOrCtrl+Shift+T',
      click: () => {
        const filePath = recentFilePaths[0];

        if (filePath) {
          mainWindow?.openFile(filePath);
        }
      },
      enabled: recentFilePaths.length > 0
    });

    if (recentFilePaths.length) {
      fileReopenSubMenu.push({ type: 'separator' });

      recentFilePaths.forEach((filePath: string) => {
        fileReopenSubMenu.push({
          label: filePath,
          click: () => {
            mainWindow?.openFile(filePath);
          }
        });
      });
    }

    fileReopenSubMenu.push({ type: 'separator' });
    fileReopenSubMenu.push({
      label: 'Clear Menu',
      click: () => {
        clearRecentFiles();
      },
      enabled: recentFilePaths.length > 0
    });

    fileSubMenu.push({ type: 'separator' });
    fileSubMenu.push({
      id: 'fileReopen',
      label: 'Reopen',
      submenu: fileReopenSubMenu
    });
    fileSubMenu.push({ type: 'separator' });
    fileSubMenu.push({
      id: 'fileSave',
      label: 'Save',
      accelerator: 'CmdOrCtrl+S',
      click: () => {
        mainWindow?.send('save');
      },
      enabled: canSave
    });
    fileSubMenu.push({
      id: 'fileSaveAs',
      label: 'Save As...',
      accelerator: 'CmdOrCtrl+Shift+S',
      click: () => {
        mainWindow?.send('save-as');
      },
      enabled: canSaveAs
    });
    fileSubMenu.push({ type: 'separator' });
    fileSubMenu.push({
      id: 'fileClose',
      label: 'Close',
      accelerator: 'CmdOrCtrl+W',
      click: () => {
        mainWindow?.send('close');
      },
      enabled: hasFiles
    });
    fileSubMenu.push({
      id: 'fileCloseAll',
      label: 'Close All',
      click: () => {
        mainWindow?.send('close-all');
      },
      enabled: hasFiles
    });

    if (!isMacOs()) {
      fileSubMenu.push({ type: 'separator' });
      fileSubMenu.push({ role: 'quit' });
    }

    // Edit menu.

    const editMenu: electron.MenuItemConstructorOptions = {
      label: menuLabel('Edit'),
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'delete', accelerator: 'Delete' },
        { type: 'separator' },
        { role: 'selectAll' }
      ]
    };

    // View menu.

    const viewMenu: electron.MenuItemConstructorOptions = {
      label: menuLabel('View'),
      submenu: [
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    };

    // Tools menu.

    const toolsSubMenu: electron.MenuItemConstructorOptions[] = [];
    const toolsMenu: electron.MenuItemConstructorOptions = {
      label: menuLabel('Tools'),
      submenu: toolsSubMenu
    };

    if (!isMacOs()) {
      toolsSubMenu.push(settingsMenuItem);
      toolsSubMenu.push({ type: 'separator' });
    }

    toolsSubMenu.push({
      label: 'Reset All...',
      click: () => {
        mainWindow?.send('reset-all');
      }
    });

    // Window menu (macOS only), which allows our window to be minimised (using Cmd+M), zoomed, and brought to the
    // front, as is customary on macOS.
    // Note: it is also part of our disabled menu (e.g., while a dialog is open), so that our window can always be
    //       minimised.

    const windowMenu: electron.MenuItemConstructorOptions = {
      role: 'windowMenu'
    };

    // Help menu.

    const helpSubMenu: electron.MenuItemConstructorOptions[] = [];
    // Note: on macOS, the help role gives our Help menu its search field.

    const helpMenu: electron.MenuItemConstructorOptions = {
      role: 'help',
      label: menuLabel('Help'),
      submenu: helpSubMenu
    };

    helpSubMenu.push({
      label: 'Home Page',
      click: () => {
        electron.shell.openExternal('https://opencor.ws/').catch((error: unknown) => {
          console.warn('OpenCOR: failed to open the home page:', formatError(error));
        });
      }
    });
    helpSubMenu.push({ type: 'separator' });
    helpSubMenu.push({
      label: 'Changelog',
      click: () => {
        mainWindow?.send('changelog');
      }
    });
    helpSubMenu.push({ type: 'separator' });
    helpSubMenu.push({
      label: 'Report Issue',
      click: () => {
        electron.shell.openExternal('https://github.com/opencor/webapp/issues/new').catch((error: unknown) => {
          console.warn('OpenCOR: failed to report an issue:', formatError(error));
        });
      }
    });

    if (!isMacOs()) {
      if (checkForUpdatesMenuItem) {
        helpSubMenu.push({ type: 'separator' });
        helpSubMenu.push(checkForUpdatesMenuItem);
      }

      helpSubMenu.push({ type: 'separator' });
      helpSubMenu.push(aboutOpencorMenuItem);
    }

    // Set our menu.

    const menu: electron.MenuItemConstructorOptions[] = [];

    if (enable) {
      if (isMacOs()) {
        menu.push(appMenu);
      }

      menu.push(fileMenu);
      menu.push(editMenu);
      menu.push(viewMenu);
      menu.push(toolsMenu);

      if (isMacOs()) {
        menu.push(windowMenu);
      }

      menu.push(helpMenu);

      enabledMenu = electron.Menu.buildFromTemplate(menu);
    } else {
      if (isMacOs()) {
        menu.push(appMenu);
      }

      menu.push(editMenu);

      if (isMacOs()) {
        menu.push(windowMenu);
      }

      disabledMenu = electron.Menu.buildFromTemplate(menu);
    }

    electron.Menu.setApplicationMenu(enable ? enabledMenu : disabledMenu);
  }
};

export const enableDisableFileCloseAndCloseAllMenuItems = (enable: boolean): void => {
  // Note: we keep track of whether we have files even if we don't currently have an enabled menu (e.g., because it got
  //       invalidated while our menu was disabled, see updateReopenMenu()), so that it gets built accordingly.

  hasFiles = enable;

  if (enabledMenu) {
    const fileCloseMenu = enabledMenu.getMenuItemById('fileClose');
    const fileCloseAllMenu = enabledMenu.getMenuItemById('fileCloseAll');

    if (fileCloseMenu && fileCloseAllMenu) {
      fileCloseMenu.enabled = hasFiles;
      fileCloseAllMenu.enabled = hasFiles;
    }
  }
};

export const enableDisableFileSaveAndSaveAsMenuItems = (enableSave: boolean, enableSaveAs: boolean): void => {
  // Note: same as for enableDisableFileCloseAndCloseAllMenuItems().

  canSave = enableSave;
  canSaveAs = enableSaveAs;

  if (enabledMenu) {
    const fileSaveMenu = enabledMenu.getMenuItemById('fileSave');
    const fileSaveAsMenu = enabledMenu.getMenuItemById('fileSaveAs');

    if (fileSaveMenu && fileSaveAsMenu) {
      fileSaveMenu.enabled = canSave;
      fileSaveAsMenu.enabled = canSaveAs;
    }
  }
};

export const updateReopenMenu = (filePaths: string[]): void => {
  // Invalidate our enabled menu so that it gets rebuilt with our new Reopen menu, but only rebuild (and set) it now if
  // our menu is enabled. Indeed, our menu may be disabled (e.g., because a dialog is open in our renderer), in which
  // case it must remain disabled and it will get rebuilt when it gets enabled again.

  enabledMenu = null;
  recentFilePaths = filePaths;

  if (menuEnabled) {
    enableDisableMainMenu(true);
  }
};
