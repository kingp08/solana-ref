import { useMemo } from "react";
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider, } from '@solana/wallet-adapter-react-ui';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { SnackbarProvider } from 'notistack';
import {
  getLedgerWallet,
  getPhantomWallet,
  getSlopeWallet,
  getSolflareWallet,
  getSolletExtensionWallet,
  getSolletWallet,
  getTorusWallet,
} from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import { WalletConnect } from './wallet'
import MagicMint from './pages/magic_mint'
import './bootstrap.min.css';
import '@solana/wallet-adapter-react-ui/styles.css';
export default function App() {
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);
  const wallets = useMemo(() => [getPhantomWallet(), getSolletExtensionWallet(), getSolflareWallet(), getLedgerWallet()], []);
  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <SnackbarProvider>
            <div style={{ marginLeft: '150px' }}>
              <WalletConnect />
            </div>
            <MagicMint />
          </SnackbarProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider >
  );
}