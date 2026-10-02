var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  default: () => index_default,
  homonymPlugin: () => homonymPlugin,
  playHomonymAction: () => playHomonymAction
});
module.exports = __toCommonJS(index_exports);
var import_core = require("@elizaos/core");
var import_viem = require("viem");
var import_accounts = require("viem/accounts");
var import_chains = require("viem/chains");
var USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
var RECIPIENT = "0xa448482995061168968ff0cf1b890506ab40250f";
var API_URL = "https://homonym-api.vercel.app";
var ERC20_ABI = (0, import_viem.parseAbi)([
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
      import_core.elizaLogger.info("[Homonym] Fetching game prompt...");
      const promptRes = await fetch(`${API_URL}/v1/prompt`);
      if (!promptRes.ok) throw new Error(`Failed to fetch prompt: ${promptRes.statusText}`);
      const promptData = await promptRes.json();
      const { word, session_id } = promptData;
      const llmPrompt = `You are a contestant on the game show Homonym. Provide a single, precise, concise dictionary definition for the word: "${word}". Output only the definition.`;
      const guess = await (0, import_core.generateText)({
        runtime,
        context: llmPrompt,
        modelClass: import_core.ModelClass.SMALL
      });
      import_core.elizaLogger.info(`[Homonym] Target: ${word} | Guess: "${guess.trim()}"`);
      const pKey = runtime.getSetting("EVM_PRIVATE_KEY") || runtime.getSetting("WALLET_PRIVATE_KEY");
      const account = (0, import_accounts.privateKeyToAccount)(pKey.startsWith("0x") ? pKey : `0x${pKey}`);
      const client = (0, import_viem.createWalletClient)({
        account,
        chain: import_chains.base,
        transport: (0, import_viem.http)()
      });
      import_core.elizaLogger.info("[Homonym] Settling $0.01 USDC on Base via x402...");
      const txHash = await client.writeContract({
        address: USDC_BASE,
        abi: ERC20_ABI,
        functionName: "transfer",
        args: [RECIPIENT, 10000n],
        chain: import_chains.base,
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
      import_core.elizaLogger.info(`[Homonym] Result: ${hostReply}`);
      if (callback) {
        callback({
          text: summary,
          content: { word, guess, txHash, hostReply, status: guessData.status }
        });
      }
      return true;
    } catch (error) {
      import_core.elizaLogger.error(`[Homonym] Action failed: ${error?.message || error}`);
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  homonymPlugin,
  playHomonymAction
});
