import {
    Action,
    Plugin,
    IAgentRuntime,
    Memory,
    State,
    HandlerCallback,
    elizaLogger,
    generateText,
    ModelClass
} from "@elizaos/core";
import { createWalletClient, http, parseAbi } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";

const USDC_BASE = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const RECIPIENT = "0xa448482995061168968ff0cf1b890506ab40250f";
const API_URL = "https://homonym-api.vercel.app";

const ERC20_ABI = parseAbi([
    "function transfer(address to, uint256 amount) returns (bool)"
]);

export const playHomonymAction: Action = {
    name: "PLAY_HOMONYM",
    similes: ["HOMONYM_GAME", "GUESS_HOMONYM", "PLAY_GAME_SHOW", "COMPETE_HOMONYM"],
    description: "Plays a round of the Homonym game show on Base. Pulls a target word, drafts a definition, sends $0.01 USDC on Base via x402, and submits the guess.",
    
    validate: async (runtime: IAgentRuntime, _message: Memory): Promise<boolean> => {
        const pKey = runtime.getSetting("EVM_PRIVATE_KEY") || runtime.getSetting("WALLET_PRIVATE_KEY");
        return !!pKey;
    },

    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        _state?: State,
        _options?: any,
        callback?: HandlerCallback
    ): Promise<boolean> => {
        try {
            elizaLogger.info("[Homonym] Fetching game prompt...");
            const promptRes = await fetch(`${API_URL}/v1/prompt`);
            if (!promptRes.ok) throw new Error(`Failed to fetch prompt: ${promptRes.statusText}`);
            const promptData = await promptRes.json();
            const { word, session_id } = promptData;

            // 1. Ask the agent's model for a dictionary definition
            const llmPrompt = `You are a contestant on the game show Homonym. Provide a single, precise, concise dictionary definition for the word: "${word}". Output only the definition.`;
            const guess = await generateText({
                runtime,
                context: llmPrompt,
                modelClass: ModelClass.SMALL
            });

            elizaLogger.info(`[Homonym] Target: ${word} | Guess: "${guess.trim()}"`);

            // 2. Prepare Base wallet
            const pKey = (runtime.getSetting("EVM_PRIVATE_KEY") || runtime.getSetting("WALLET_PRIVATE_KEY")) as `0x${string}`;
            const account = privateKeyToAccount(pKey.startsWith("0x") ? pKey : `0x${pKey}`);
            
            const client = createWalletClient({
                account,
                chain: base,
                transport: http()
            });

            // 3. Send $0.01 USDC (10,000 units) on Base
            elizaLogger.info("[Homonym] Settling $0.01 USDC on Base via x402...");
            const txHash = await client.writeContract({
                address: USDC_BASE,
                abi: ERC20_ABI,
                functionName: "transfer",
                args: [RECIPIENT, 10000n],
                chain: base,
                account
            });

            // 4. Encode x402 payment signature header
            const signatureHeader = Buffer.from(JSON.stringify({ txHash })).toString("base64");

            // 5. Submit guess to API
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
            
            const summary = `🎮 [Homonym Round]\nWord: ${word}\nMy Definition: "${guess.trim()}"\nTx: ${txHash}\nHost: "${hostReply}"`;
            elizaLogger.info(`[Homonym] Result: ${hostReply}`);

            if (callback) {
                callback({
                    text: summary,
                    content: { word, guess, txHash, hostReply, status: guessData.status }
                });
            }

            return true;
        } catch (error: any) {
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

export const homonymPlugin: Plugin = {
    name: "homonym",
    description: "Interactive Homonym game show integration on Base via x402",
    actions: [playHomonymAction],
    evaluators: [],
    providers: []
};

export default homonymPlugin;
