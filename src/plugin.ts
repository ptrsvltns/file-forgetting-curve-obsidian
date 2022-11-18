import { Notice, Plugin, Menu, TAbstractFile, Setting } from 'obsidian';

import { v4 as uuid } from 'uuid';
import dayjs from 'dayjs';

import { REMEMBER_HELPER_VIEW, FileForgettingCurveView, getExpiredFiles } from './view';
import { PickerCallback, PickerEvent, PickerModal } from './component/picker';
import { InputModal } from './component/input';

import { DateFormat, ForgettingCurveTime, getDiffForgettingCurveTime, getNextForgettingCurveTime } from './util/date';
import { createElement } from './util/dom';

import lang from './lang';

export type LabelInfo = {
  id: string,
  name: string
};

export type FileInfo = {
  label: string,
  file: string,
  name: string,
  remark: string,
  level: number,
  remind: string,
  date: string
};

interface Data {
  labels: Array<LabelInfo>,
  files: Array<FileInfo>
}

const DEFAULT_DATA: Data = {
  labels: [],
  files: []
}

export default class FileForgettingCurve extends Plugin {
  data: Data;

  async loadPluginData() {
    this.data = Object.assign({}, DEFAULT_DATA, await this.loadData());
  }

  async savePluginData() {
    await this.saveData(this.data);
  }

  async onload() {
    await this.loadPluginData();

    this.registerView(REMEMBER_HELPER_VIEW, (leaf) => new FileForgettingCurveView(this, leaf));

    setTimeout(() => {
      this.addRibbonIcon("bell", lang.get("View - File Forgetting Curve"), () => {
        this.activateView();
      });
    }, 50);

    this.registerEvent(this.app.workspace.on('file-menu', (menu, file) => {
      this.createMenu(menu, file);
    }));

    this.registerEvent(this.app.workspace.on('editor-menu', (menu) => {
      this.createMenu(menu);
    }));

    let count = 0;
    this.registerEvent(this.app.workspace.on('file-open', () => {
      count++;
      if (count % 5 != 0) return;
      setTimeout(() => {
        this.noticeExpiredFiles();
      }, 1500);
    }));

    setTimeout(() => {
      this.noticeExpiredFiles();
    }, 3000);
  }

  noticeExpiredFiles() {
    const expired = getExpiredFiles(this.data.files);
    if (expired.length) {
      if (expired.length > 1) {
        new Notice(`${lang.get("File Expired")}!\r\n${expired.length}\r\n${lang.get("Open [View - File Forgetting Curve] to check")}`);
      } else {
        const abstractFile = this.app.vault.getAbstractFileByPath(expired[0].file);
        if (abstractFile) {
          new Notice(`${lang.get("File Expired")}!\r\n${expired[0].name || abstractFile.name}\r\n${lang.get("Open [View - File Forgetting Curve] to check")}${expired[0].remark ? "\r\n" + expired[0].remark : ""}`);
        }
      }
    }
  }

  async onunload() {
    this.app.workspace.detachLeavesOfType(REMEMBER_HELPER_VIEW);
  }

  async activateView() {
    this.app.workspace.detachLeavesOfType(REMEMBER_HELPER_VIEW);

    await this.app.workspace.getRightLeaf(false).setViewState({
      type: REMEMBER_HELPER_VIEW,
      active: true,
    });

    this.app.workspace.revealLeaf(
      this.app.workspace.getLeavesOfType(REMEMBER_HELPER_VIEW)[0]
    );
  }

  containsLabel(key: keyof (LabelInfo), value: any) {
    for (let i of this.data.labels) {
      if (i[key] === value) return true;
    }
    return false;
  }

  createLabelOptions() {
    const result = [];
    for (let i of this.data.labels) {
      result.push({
        text: i.name,
        value: i.id
      });
    }
    return result;
  }

  openPicker(options: {
    buttons?: boolean,
    title?: string,
    event?: PickerEvent,
    callback: PickerCallback
  }) {
    const picker = new PickerModal(this.app, {
      title: options.title || lang.get("Pick Label"),
      options: this.createLabelOptions(),
      width: "730px",
      event: options.event,
      buttons: options.buttons === false ? undefined : [{
        text: lang.get("Remove Label"),
        click: () => {
          this.openPicker({
            buttons: false,
            title: lang.get("Remove Label"),
            callback: (_, data) => {
              if (Array.isArray(data)) return;
              for (let i of this.data.labels) {
                if (i.id === data.value) {
                  this.data.labels.splice(this.data.labels.indexOf(i), 1);
                  break;
                }
              }
              this.savePluginData();
              picker.options = this.createLabelOptions();
              picker.create();
              FileForgettingCurveView.instance?.update();
            }
          });
        }
      }, {
        text: lang.get("Create New Label"),
        click: (modal) => {
          new InputModal(this.app, {
            title: lang.get("Create New Label"),
            content: lang.get("Please enter a label name"),
            width: "330px",
            callback: (value) => {
              if (!value) {
                new Notice(lang.get("Label name cannot be empty"));
                return;
              }
              if (this.containsLabel('name', value)) {
                new Notice(lang.get("Already exists label: {{label}}", { label: value }));
                return;
              }
              let id;
              while (true) {
                id = uuid();
                if (!this.containsLabel('id', id)) break;
              }
              this.data.labels.push({ id, name: value });
              this.savePluginData();
              modal.options = this.createLabelOptions();
              modal.create();
              FileForgettingCurveView.instance?.update();
            }
          }).open();
        }
      }],
      callback: options.callback
    });
    picker.open();
  }

  async createMenu(menu: Menu, file: TAbstractFile | null = null) {
    const activeFile: TAbstractFile | null = file || this.app.workspace.getActiveFile();
    if (!activeFile) return;

    let remember: FileInfo | null = null;
    for (let i of this.data.files) {
      if (i.file === activeFile.path) {
        remember = i;
      }
    }
    if (remember) {
      const file = remember;
      menu.addItem((item) => {
        item.setTitle(lang.get("Remove Remind - File Forgetting Curve"))
          .setIcon("bell-off")
          .onClick(() => {
            let changed = false;
            for (let i = this.data.files.length - 1; i >= 0; i--) {
              if (this.data.files[i].file === activeFile.path) {
                this.data.files.splice(i, 1);
                changed = true;
              }
            }
            if (changed) {
              this.savePluginData();
              FileForgettingCurveView.instance?.updateList();
            }
          })
        return item;
      });
      menu.addItem((item) => {
        item.setTitle(lang.get("Modify Remind - File Forgetting Curve"))
          .setIcon("bell")
          .onClick(() => {
            this.openPicker({
              title: lang.get("Modify Remind"),
              event: {
                content: (modal) => {
                  if (!modal.options.length) return;
                  createElement(modal.contentEl.createEl("h4"), { text: lang.get("Remind Date"), style: { margin: "20px 0" } })
                  let nextTime = getNextForgettingCurveTime(file.level);
                  let lastOption: any = null;
                  const select = createElement<"select">(modal.contentEl.createEl("select"), {
                    class: "dropdown",
                    change: (el) => {
                      for (let i of ForgettingCurveTime) {
                        if (i.name === el.value) {
                          modal.storage.remind = i;
                        }
                      }
                    }
                  }, ForgettingCurveTime.map((i) => {
                    let recommend = nextTime === i;
                    if (recommend) modal.storage.remind = i;
                    return createElement("option", {
                      text: `${i.date()} - ${i.name}${recommend ? " - " + lang.get("Recommend") : ""}`, value: i.name, create: (el) => {
                        lastOption = el;
                      }
                    })
                  }));
                  if (!modal.storage.remind) {
                    modal.storage.remind = ForgettingCurveTime[ForgettingCurveTime.length - 1];
                    if (lastOption) lastOption.innerText = lastOption.innerText + " - " + lang.get("Recommend");
                  }
                  select.value = modal.storage.remind.name;
                  createElement(modal.contentEl.createEl("div"), null, ForgettingCurveTime.map((i) => {
                    const diff = getDiffForgettingCurveTime(file.level, i.level);
                    if (diff === null) return null;
                    const map: Record<string, string> = {
                      "-5": "Impossible Forget",
                      "-4": "Maybe Forget",
                      "-3": "Very Easy",
                      "-2": "Easy",
                      "-1": "Normal",
                      "0": "Hard",
                      "1": "Very Hard",
                      "2": "Forgotten Some",
                      "3": "Forgeted"
                    }
                    const description = map[diff];
                    if (!description) return null;
                    let recommend = nextTime === i;
                    return createElement<"button">(modal.contentEl.createEl("button"), {
                      text: `${lang.get(description)} - ${i.name}${recommend ? " - " + lang.get("Recommend") : ""}`,
                      style: { marginRight: "10px", marginTop: "10px" },
                      click: () => {
                        modal.storage.remind = i;
                        select.value = modal.storage.remind.name;
                      }
                    })
                  }));
                  createElement(modal.contentEl.createEl("h4"), { text: lang.get("Name"), style: { margin: "20px 0" } })
                  createElement<"input">(modal.contentEl.createEl("input"), {
                    style: { width: "100%", padding: "5px 10px" },
                    attrs: { type: "text" },
                    value: file.name || activeFile.name,
                    change: (el) => {
                      modal.storage.name = el.value;
                    }
                  });
                  createElement(modal.contentEl.createEl("h4"), { text: lang.get("Remark"), style: { margin: "20px 0" } })
                  createElement<"textarea">(modal.contentEl.createEl("textarea"), {
                    style: { width: "100%", height: "100px", resize: "none", padding: "10px" },
                    value: file.remark || "",
                    change: (el) => {
                      modal.storage.remark = el.value;
                    }
                  });
                }
              },
              callback: (modal, data) => {
                if (activeFile && !Array.isArray(data)) {
                  file.label = data.value;
                  file.name = activeFile.name !== modal.storage.name ? modal.storage.name : "";
                  file.remark = modal.storage.remark;
                  file.level = modal.storage.remind.level;
                  file.remind = modal.storage.remind.date();
                  this.savePluginData();
                  FileForgettingCurveView.instance?.updateList();
                }
              }
            });
          });
        return item;
      });
    } else {
      menu.addItem((item) => {
        item.setTitle(lang.get("Create Remind - File Forgetting Curve"))
          .setIcon("bell")
          .onClick(() => {
            this.openPicker({
              event: {
                content: (modal) => {
                  if (!modal.options.length) return;
                  createElement(modal.contentEl.createEl("h4"), { text: lang.get("Remind Date"), style: { margin: "20px 0" } })
                  modal.storage.remind = ForgettingCurveTime[1];
                  const select = createElement<"select">(modal.contentEl.createEl("select"), {
                    class: "dropdown",
                    change: (el) => {
                      for (let i of ForgettingCurveTime) {
                        if (i.name === el.value) {
                          modal.storage.remind = i;
                        }
                      }
                    }
                  }, ForgettingCurveTime.map((i) => {
                    let recommend = modal.storage.remind == i;
                    return createElement("option", { text: `${i.date()} - ${i.name}${recommend ? " - " + lang.get("Recommend") : ""}`, value: i.name })
                  }));
                  select.value = modal.storage.remind.name;
                  createElement(modal.contentEl.createEl("div"), { style: { marginTop: "10px" } }, ForgettingCurveTime.map((i, index) => {
                    return createElement<"button">(modal.contentEl.createEl("button"), {
                      text: `${lang.get(i.description)} - ${i.name}${index === 1 ? " - " + lang.get("Recommend") : ""}`,
                      style: { marginRight: "10px", marginTop: "10px" },
                      click: () => {
                        modal.storage.remind = i;
                        select.value = modal.storage.remind.name;
                      }
                    })
                  }));
                  createElement(modal.contentEl.createEl("h4"), { text: lang.get("Name"), style: { margin: "20px 0" } })
                  createElement<"input">(modal.contentEl.createEl("input"), {
                    style: { width: "100%", padding: "5px 10px" },
                    attrs: { type: "text" },
                    value: activeFile.name,
                    change: (el) => {
                      modal.storage.name = el.value;
                    }
                  });
                  createElement(modal.contentEl.createEl("h4"), { text: lang.get("Remark"), style: { margin: "20px 0" } })
                  createElement<"textarea">(modal.contentEl.createEl("textarea"), {
                    style: { width: "100%", height: "100px", resize: "none", padding: "10px" },
                    change: (el) => {
                      modal.storage.remark = el.value;
                    }
                  });
                }
              },
              callback: (modal, data) => {
                if (activeFile && !Array.isArray(data)) {
                  this.data.files.push({
                    label: data.value,
                    file: activeFile.path,
                    name: activeFile.name !== modal.storage.name ? modal.storage.name : "",
                    remark: modal.storage.remark,
                    level: modal.storage.remind.level,
                    remind: modal.storage.remind.date(),
                    date: dayjs().format(DateFormat)
                  });
                  this.savePluginData();
                  FileForgettingCurveView.instance?.updateList();
                }
              }
            });
          })
        return item;
      });
    }
  }
}