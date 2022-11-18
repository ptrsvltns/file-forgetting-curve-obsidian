import en from './en';
import zh from './zh';

const lang = {
  en,
  zh,
  get
}

function get(text: string, args?: Record<string, string>): string {
  const language = window.i18next?.language || "en";
  const map = (lang as any)[language] || en;
  let result: string = map[text] || (en as any)[text] || text;
  if (args) {
    for (let i in args) {
      result = result.replace(new RegExp(`\\{\\{${i}\\}\\}`, "g"), args[i])
    }
  }
  return result;
}

lang.get = get;

export default lang;