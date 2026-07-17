export type Greeting = {
  language: string;
  text: string;
};

export const GREETINGS: readonly Greeting[] = [
  { language: "English", text: "Hello, world" },
  { language: "Spanish", text: "Hola, mundo" },
  { language: "French", text: "Bonjour, le monde" },
  { language: "German", text: "Hallo, Welt" },
  { language: "Japanese", text: "こんにちは、世界" },
  { language: "Korean", text: "안녕하세요, 세계" },
  { language: "Portuguese", text: "Olá, mundo" },
  { language: "Hindi", text: "नमस्ते, दुनिया" },
  { language: "Arabic", text: "مرحبا بالعالم" },
  { language: "Swahili", text: "Habari, dunia" },
];

export function nextGreetingIndex(current: number): number {
  return (current + 1) % GREETINGS.length;
}

export function greetingAt(index: number): Greeting {
  const greeting = GREETINGS[index % GREETINGS.length];
  if (!greeting) {
    throw new Error("GREETINGS must not be empty");
  }
  return greeting;
}
