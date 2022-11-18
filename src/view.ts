import dayjs from "dayjs";
import { ItemView, Menu, TFile, WorkspaceLeaf } from "obsidian";

import FileForgettingCurve, { FileInfo } from "./plugin";

import { createElement } from "./util/dom";

import lang from './lang';

export const REMEMBER_HELPER_VIEW = "remember-helper-view";

export function getExpiredFiles(fileList: Array<FileInfo>, label?: string) {
  const files = [];
  for (let i of fileList) {
    if (!label || i.label == label) {
      if (dayjs() > dayjs(i.remind)) {
        files.push(i);
      }
    }
  }
  return files;
}

export function getRemindFiles(fileList: Array<FileInfo>, label?: string) {
  const files = [];
  for (let i of fileList) {
    if (!label || i.label == label) {
      if (dayjs() < dayjs(i.remind)) {
        files.push(i);
      }
    }
  }
  return files;
}

export class FileForgettingCurveView extends ItemView {

  static instance: FileForgettingCurveView | null = null;

  constructor(public plugin: FileForgettingCurve, leaf: WorkspaceLeaf) {
    super(leaf);
  }

  getViewType() {
    return REMEMBER_HELPER_VIEW;
  }

  getIcon() {
    return "bell";
  }

  getDisplayText() {
    return lang.get("File Forgetting Curve");
  }

  async onOpen() {
    FileForgettingCurveView.instance = this;
    this.update();
  }

  createEmpty() {
    return createElement("div", {
      text: lang.get("Empty"),
      style: {
        width: "100%",
        padding: "40px 0",
        textAlign: "center"
      }
    });
  }

  labelElement: HTMLSelectElement;
  update() {
    const container = this.containerEl.children[1];
    container.empty();

    if (!this.plugin.data.labels.length) {
      container.append(this.createEmpty());
      return;
    }

    container.append(createElement("div", null, [
      createElement("select", {
        class: "dropdown",
        style: { width: "100%", maxWidth: "300px" },
        change: () => {
          this.updateList(false);
        },
        create: (el) => {
          this.labelElement = el as HTMLSelectElement;
        }
      }, this.plugin.data.labels.map((label) => {
        return createElement("option", { text: label.name, value: label.id });
      })),
      createElement("div", null, [
        createElement("button", {
          text: lang.get("Reload"),
          style: { marginRight: "10px", marginTop: "10px" },
          click: () => {
            this.updateList(false);
          }
        }),
        createElement("button", {
          text: lang.get("Remove Label"),
          style: { marginRight: "10px", marginTop: "10px" },
          class: "mod-cta",
          click: () => {
            this.plugin.openPicker({
              buttons: false,
              title: lang.get("Remove Label"),
              callback: (_, data) => {
                if (Array.isArray(data)) return;
                for (let i of this.plugin.data.labels) {
                  if (i.id === data.value) {
                    this.plugin.data.labels.splice(this.plugin.data.labels.indexOf(i), 1);
                    break;
                  }
                }
                this.plugin.savePluginData();
                this.update();
              }
            });
          }
        })
      ])
    ]));

    if (this.plugin.data.labels.length) this.labelElement.value = this.plugin.data.labels[0].id;

    this.expiredElement = createElement("div");
    container.append(this.expiredElement);

    this.remindElement = createElement("div");
    container.append(this.remindElement);

    this.updateList();
  }

  updateList(auto: boolean = true) {
    this.plugin.data.files = this.plugin.data.files.sort((a, b) => {
      const start = dayjs(a.remind);
      const end = dayjs(b.remind);
      return start === end ? 0 : start > end ? 1 : -1;
    })
    this.updateExpired(auto);
    this.updateRemind();
  }

  createDiffTime(remind: string) {
    const start = dayjs();
    const end = dayjs(remind);
    if (start >= end) return null;
    let result = [];
    let days = end.diff(start, 'day', true);
    if (days > 1) result.push(Math.floor(days) + " " + lang.get(days >= 2 ? "days" : "day"));
    var hours = (days - Math.floor(days)) * 24;
    if (hours > 1) result.push(Math.floor(hours) + " " + lang.get(hours >= 2 ? "hours" : "hour"));
    var minutes = (hours - Math.floor(hours)) * 60;
    if (minutes > 1) result.push(Math.floor(minutes) + " " + lang.get(minutes >= 2 ? "minutes" : "minute"));
    return createElement("div", {
      style: { display: "inline-block", marginRight: "10px", marginBottom: "5px", color: "#888" },
      text: result.join(" ")
    });
  }

  createFileLink(el: HTMLElement, file: FileInfo): boolean {
    const abstractFile = this.app.vault.getAbstractFileByPath(file.file);
    if (abstractFile) {
      el.append(createElement("div", {
        class: "cm-s-obsidian",
        style: { backgroundColor: "var(--background-primary)", padding: "10px 0 5px 10px", borderRadius: "8px", marginBottom: "10px", cursor: "pointer" },
        on: {
          click: () => {
            this.app.workspace.getLeaf().openFile(abstractFile as TFile);
          },
          contextmenu: (_, e) => {
            const menu = new Menu();
            this.plugin.createMenu(menu, abstractFile);
            menu.showAtMouseEvent(e as MouseEvent);
          }
        }
      }, [
        createElement("span", {
          text: file.name || abstractFile.name,
          class: "cm-link",
          style: { marginBottom: "5px", marginRight: "10px" }
        }),
        this.createDiffTime(file.remind),
        file.remark ? createElement("div", {
          style: { color: "var(--inline-title-color)", marginRight: "10px", marginBottom: "5px" },
          text: file.remark
        }) : null,
        file.name ? createElement("div", {
          style: { color: "#888", fontSize: "12px", marginRight: "10px", marginBottom: "5px" },
          text: abstractFile.name
        }) : null
      ]));
      return true;
    } else {
      const index = this.plugin.data.files.indexOf(file);
      if (index != -1) this.plugin.data.files.splice(index, 1);
      return false;
    }
  }

  expiredElement: HTMLElement;
  updateExpired(auto: boolean = true) {
    this.expiredElement.empty();
    this.expiredElement.append(createElement("h4", { text: lang.get("Expired"), style: { margin: "10px 0" } }));

    const all = getExpiredFiles(this.plugin.data.files);
    let files = getExpiredFiles(all, this.labelElement.value);

    if (auto && !files.length && all.length) {
      let changed = false;
      for (let i of all) {
        for (let x of this.plugin.data.labels) {
          if (i.label == x.id) {
            this.labelElement.value = x.id;
            changed = true;
            break;
          }
        }
        if (changed) break;
      }
      if (changed) files = getExpiredFiles(all, this.labelElement.value);
    }

    if (!files.length) {
      this.expiredElement.append(createElement("div", "-"));
      return;
    }

    let changed = false;
    for (let i of files) {
      if (this.createFileLink(this.expiredElement, i)) changed = true;
    }
    if (changed) this.plugin.savePluginData();
  }

  remindElement: HTMLElement;
  updateRemind() {
    this.remindElement.empty();
    this.remindElement.append(createElement("h4", { text: lang.get("Waiting for a reminder"), style: { margin: "10px 0" } }));

    const files = getRemindFiles(this.plugin.data.files, this.labelElement.value);

    if (!files.length) {
      this.remindElement.append(createElement("div", "-"));
      return;
    }

    let changed = false;
    for (let i of files) {
      if (this.createFileLink(this.remindElement, i)) changed = true;
    }
    if (changed) this.plugin.savePluginData();
  }

  async onClose() {
    FileForgettingCurveView.instance = null;
  }
}