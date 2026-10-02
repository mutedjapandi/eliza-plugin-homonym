// src/index.ts
import {
  elizaLogger,
  generateText,
  ModelClass
} from "@elizaos/core";
import { createWalletClient, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
var USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
var RECIPIENT = "0xa448482995061168968ff0cf1b890506ab40250f";
var API_URL = "https://homonym-api.vercel.app";
var ERC20_ABI = parseAbi([
  "function transfer(address to, uint256 amount) returns (bool)"
]);
var playHomonymAction = {
  name: "PLAY_HOMONYM",
  similes: ["HOMONYM_GAME", "GUESS_HOMONYM", "PLAY_GAME_SHOW", "COMPETE_HOMONYM"],
  description: "Plays a round of the Homonym game show on Base. Pulls a target word, drafts a definition, sends $0.01 USDC on Base via x402, and submits the guess.",
  validate: async (runtime, _message) => {
    const pKey = runtime.getSetting("EVM_PRIVATE_KEY") || runtime.getSetting("WALLET_PRIVATE_KEY");
    return !!pKey;
  },
  handler: async (runtime, message, _state, _options, callback) => {
    try {
      elizaLogger.info("[Homonym] Fetching game prompt...");
      const promptRes = await fetch(`${API_URL}/v1/prompt`);
      if (!promptRes.ok) throw new Error(`Failed to fetch prompt: ${promptRes.statusText}`);
      const promptData = await promptRes.json();
      const { word, session_id } = promptData;
      const llmPrompt = `You are a contestant on the game show Homonym. Provide a single, precise, concise dictionary definition for the word: "${word}". Output only the definition.`;
      const guess = await generateText({
        runtime,
        context: llmPrompt,
        modelClass: ModelClass.SMALL
      });
      elizaLogger.info(`[Homonym] Target: ${word} | Guess: "${guess.trim()}"`);
      const pKey = runtime.getSetting("EVM_PRIVATE_KEY") || runtime.getSetting("WALLET_PRIVATE_KEY");
      const account = privateKeyToAccount(pKey.startsWith("0x") ? pKey : `0x${pKey}`);
      const client = createWalletClient({
        account,
        chain: base,
        transport: http()
      });
      elizaLogger.info("[Homonym] Settling $0.01 USDC on Base via x402...");
      const txHash = await client.writeContract({
        address: USDC_BASE,
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [RECIPIENT, 10000n],
        chain: base,
        account
      });
      const signatureHeader = Buffer.from(JSON.stringify({ txHash })).toString("base64");
      const guessRes = await fetch(`${API_URL}/v1/guess`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "PAYMENT-SIGNATURE": signatureHeader,
          "User-Agent": `ElizaOS-Agent-${runtime.character.name || "Contestant"}`
        },
        body: JSON.stringify({
          session_id,
          guess: guess.trim()
        })
      });
      const guessData = await guessRes.json();
      const hostReply = guessData.result || "Host gave no response.";
      const summary = `\u{1F3AE} [Homonym Round]
Word: ${word}
My Definition: "${guess.trim()}"
Tx: ${txHash}
Host: "${hostReply}"`;
      elizaLogger.info(`[Homonym] Result: ${hostReply}`);
      if (callback) {
        callback({
          text: summary,
          content: { word, guess, txHash, hostReply, status: guessData.status }
        });
      }
      return true;
    } catch (error) {
      elizaLogger.error(`[Homonym] Action failed: ${error?.message || error}`);
      if (callback) {
        callback({ text: `Homonym game round failed: ${error?.message || error}` });
      }
      return false;
    }
  },
  examples: [
    [
      {
        user: "{{user1}}",
        content: { text: "Play a round of Homonym." }
      },
      {
        user: "{{agentName}}",
        content: {
          text: "Connecting to Homonym on Base. Paying $0.01 USDC and submitting my definition...",
          action: "PLAY_HOMONYM"
        }
      }
    ]
  ]
};
var homonymPlugin = {
  name: "homonym",
  description: "Interactive Homonym game show integration on Base via x402",
  actions: [playHomonymAction],
  evaluators: [],
  providers: []
};
var index_default = homonymPlugin;
export {
  index_default as default,
  homonymPlugin,
  playHomonymAction
};
