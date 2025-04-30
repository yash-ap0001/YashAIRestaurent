interface Window {
  SpeechRecognition: typeof SpeechRecognition;
  webkitSpeechRecognition: typeof SpeechRecognition;
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal?: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  new (): SpeechRecognition;
  grammars: any;
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  serviceURI: string;
  onresult: (event: SpeechRecognitionEvent) => void;
  onstart: () => void;
  onend: () => void;
  onerror: (event: Event) => void;
  onspeechstart: () => void;
  onspeechend: () => void;
  onnomatch: () => void;
  onaudiostart: () => void;
  onaudioend: () => void;
  onsoundstart: () => void;
  onsoundend: () => void;
  start(): void;
  stop(): void;
  abort(): void;
}