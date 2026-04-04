// Skill: read-file
// Czyta plik z dysku i zwraca jego zawartosc z metadanymi (rozmiar, rozszerzenie)
// Tags: file, read, filesystem

import {readFileSync,existsSync} from "fs"; export function readFile(p){if(!existsSync(p))throw new Error("brak: "+p);return {content:readFileSync(p,"utf-8"),name:p.split(/[/\]/).pop()}}
