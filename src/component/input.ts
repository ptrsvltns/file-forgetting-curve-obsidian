import { App, Modal, Setting } from "obsidian";

export class InputModal extends Modal {

  title: string = "Input";
  content: string = "";
  placeholder: string = "";
  width?: string;
  height?: string;
  callback: (value: string) => void = () => {};

  constructor(app: App, config: {
    title?: string,
    content?: string,
    placeholder?: string,
    width?: string,
    height?: string,
    callback: (value: string) => void
  }) {
    super(app);
    this.title = config.title || this.title;
    this.content = config.content || this.content;
    this.placeholder = config.placeholder || this.placeholder;
    this.width = config.width || this.width;
    this.height = config.height || this.height;
    this.callback = config.callback;
  }

  onOpen() {
    let { contentEl } = this;

    if (this.width) this.modalEl.style.width = this.width;
    if (this.height) this.modalEl.style.height = this.height;

    contentEl.createEl("h1", { text: this.title });
    contentEl.createEl("p", { text: this.content });
    const input = contentEl.createEl("input", { placeholder: this.placeholder });
    input.type = "text";
    input.style.width = "100%";
    input.style.padding = "5px 10px";
    input.addEventListener("keypress", (e) => {
      if (e.key == "Enter") {
        this.callback(input.value);
        this.close();
      }
    });

    new Setting(contentEl)
      .addButton((button) => button.setButtonText("OK")
        .onClick(() => {
          this.callback(input.value);
          this.close();
        }))
  }

  onClose() {
    let { contentEl } = this;
    contentEl.empty();
  }
}