const { Keypair, Transaction, SystemProgram, Connection, LAMPORTS_PER_SOL, clusterApiUrl, PublicKey, sendAndConfirmTransaction } = require("@solana/web3.js");
const { Token, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } = require("@solana/spl-token");
const Bip39 = require('bip39');
const ed25519 = require('ed25519-hd-key');
const bs58 = require('bs58');
const fs = require('fs')


const conn = new Connection("https://solana-mainnet.phantom.tech")
// const conn = new Connection("https://api.devnet.solana.com")

//const generatedMnemonic = Bip39.generateMnemonic();
const generatedMnemonic = "survey best shrug concert cook lumber scout devote faint until repeat isolate";
// const generatedMnemonic = "genius eternal horn accuse position female copy skin breeze render winner perfect";
console.log("\nMnemonics : " + generatedMnemonic);

// A. creates a main wallet address and outputs its public key.
const main_seed = Bip39.mnemonicToSeedSync(generatedMnemonic);
const seed = Bip39.mnemonicToSeedSync(generatedMnemonic).slice(0, 32);
const mainWallet = Keypair.fromSeed(seed);
console.log("A. Main wallet public key\n", mainWallet.publicKey.toString());

// B. create arbitrary number of addresses from seed.
const wallet_count = 10;
let wallet_array = [];

function B() {
    for (let i = 0; i < wallet_count; i++) {
        const derivePath = `m/44'/501'/${i}'/0'`;
        const derivedSeed = ed25519.derivePath(derivePath, main_seed.toString('hex')).key;
        const keypair = Keypair.fromSeed(derivedSeed);
        wallet_array.push(keypair);
    }
}

// C. output a file that contains the public and private keys of those accounts, in the format pubkey: privkey
function C() {
    console.log("C. output a file that contains the public and private keys of accounts");
    let content = "";
    for (let i = 0; i < wallet_count; i++) {
        content += wallet_array[i].publicKey.toString() + ":" + bs58.encode(wallet_array[i].secretKey) + "\n";
        console.log(wallet_array[i].publicKey.toString() + ":" + bs58.encode(wallet_array[i].secretKey));
    }
    fs.writeFile('./generated_addresses.txt', content, err => {
        if (err) {
            console.error(err)
        }
        //file written successfully
    });
}

// D. distribute SOL balance equally from main address to the addresses created.
const chunk = 10;
async function D() {
    const main_wallet_balance = await conn.getBalance(mainWallet.publicKey);
    const fee = LAMPORTS_PER_SOL / 100;
    console.log("Main wallet balance : " + main_wallet_balance);
    if (main_wallet_balance <= fee)
        return;
    for (let j = 0; j < wallet_count / chunk; j++) {
        let tx = new Transaction();
        let count = wallet_count - (j + 1) * chunk > 0 ? chunk * (j + 1) : wallet_count;
        for (let i = j * chunk; i < count; i++) {
            tx.add(SystemProgram.transfer({
                fromPubkey: mainWallet.publicKey,
                toPubkey: wallet_array[i].publicKey,
                lamports: parseInt((main_wallet_balance - fee) / wallet_count).toString()
            }));
        }
        try {
            sendAndConfirmTransaction(conn, tx, [mainWallet]);
        } catch (error) {
            console.log(error);
        }
    }
}
const getTokenWallet = async (owner, mint) => {
    return (
        await PublicKey.findProgramAddress(
            [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
            ASSOCIATED_TOKEN_PROGRAM_ID
        )
    )[0];
}
// E. send all tokens (except SOL) from all addresses to main address.
async function E() {
    for (let i = 0; i < wallet_count; i++) {
        const tokenAccounts = await conn.getParsedTokenAccountsByOwner(wallet_array[i].publicKey, { programId: TOKEN_PROGRAM_ID }, "finalized");
        console.log(tokenAccounts.value.length);
        for (let index = 0; index < tokenAccounts.value.length; index++) {
            let transaction = new Transaction()
            try {
                const tokenAccount = tokenAccounts.value[index];
                const tokenMint = new PublicKey(tokenAccount.account.data.parsed.info.mint);
                const toTokenAccount = await getTokenWallet(mainWallet.publicKey, tokenMint);
                if ((await conn.getAccountInfo(toTokenAccount)) === null)
                    transaction.add(Token.createAssociatedTokenAccountInstruction(ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, tokenMint, toTokenAccount, mainWallet.publicKey, wallet_array[i].publicKey))
                const tokenAmount = tokenAccount.account.data.parsed.info.tokenAmount;
                if (Number(tokenAmount.amount) > 0) {
                    transaction.add(
                        Token.createTransferInstruction(
                            TOKEN_PROGRAM_ID,
                            tokenAccount.pubkey,
                            toTokenAccount,
                            wallet_array[i].publicKey,
                            [],
                            Number(tokenAmount.amount)
                        )
                    );
                    sendAndConfirmTransaction(conn, transaction, [wallet_array[i]]);
                }
            } catch (error) {
                console.log(error);
            }
        }
    }
}

// F. send all SOL from all addresses to main address.
async function F() {
    for (let j = 0; j < wallet_count / chunk; j++) {
        let count = wallet_count - (j + 1) * chunk > 0 ? chunk * (j + 1) : wallet_count;
        for (let i = j * chunk; i < count; i++) {
            const balance = await conn.getBalance(wallet_array[i].publicKey);
            const fee = 0.000005 * LAMPORTS_PER_SOL;
            if (balance <= fee)
                continue;
            let tx = new Transaction();
            tx.add(SystemProgram.transfer({
                fromPubkey: wallet_array[i].publicKey,
                toPubkey: mainWallet.publicKey,
                lamports: (balance - fee)
            }));
            try {
                let hash = sendAndConfirmTransaction(conn, tx, [wallet_array[i]]);
            } catch (error) {
                console.log(error);
            }
        }
    }
}
function G() {
    console.log(bs58.encode(mainWallet.secretKey));
}

async function main() {
    const main_balance = await conn.getBalance(mainWallet.publicKey);
    console.log(main_balance);
    // B. create arbitrary number of addresses from seed.
    B();
    // C. output a file that contains the public and private keys of those accounts, in the format pubkey: privkey
    C();
    // D. distribute SOL balance equally from main address to the addresses created.
    // await D();
    console.log("Sol sent okay!");
    // E. send all tokens (except SOL) from all addresses to main address.
    // await E();
    // console.log("Token sent okay!");
    // F. send all SOL from all addresses to main address.
    // await F();
    // console.log("Sol back sent okay!");
    // g. show private key of main address.
    G();
}

main();