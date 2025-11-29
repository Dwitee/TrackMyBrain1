import { useCactusLM } from 'cactus-react-native';

export function useLocalLM() {
  const lm = useCactusLM();

  async function generateSummary(text: string) {
    const result = await lm.complete({
      messages: [{ role: 'user', content: `Summarize: ${text}` }],
    });
    return result.response;
  }

  async function embedText(text: string) {
    const e = await lm.embed({ text });
    return e.embedding;
  }

  return { lm, generateSummary, embedText };
}
