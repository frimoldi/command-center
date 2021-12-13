import * as Sentry from "@sentry/browser";

import LedgerTransportU2F from "@ledgerhq/hw-transport-u2f";
import LedgerTransportWebUSB from "@ledgerhq/hw-transport-webusb";
import {
    renLocalnet,
    renMainnet,
    RenNetwork,
    RenNetworkDetails,
    renTestnet,
} from "@renproject/contracts";
import Onboard from "bnc-onboard";
import { API as OnboardInstance } from "bnc-onboard/dist/src/interfaces";
import React, { useCallback, useEffect, useState } from "react";
import { createContainer } from "unstated-next";
import Web3 from "web3";
import { toChecksumAddress } from "web3-utils";

import BigNumber from "bignumber.js";
import Notify, { API as NotifyInstance } from "bnc-notify";
// @ts-ignore
import ENS, { getEnsAddress } from "@ensdomains/ensjs";
import { LoggedOut } from "../controllers/common/popups/LoggedOut";
import { getWeb3BrowserName, Web3Browser } from "../lib/ethereum/browsers";
import { getReadOnlyWeb3 } from "../lib/ethereum/getWeb3";
import {
    BLOCKNATIVE_KEY,
    EXTRA_WALLETS_INFURA_KEY,
    INFURA_KEY,
    PORTIS_KEY,
} from "../lib/react/environmentVariables";
import { PopupContainer } from "./popupContainer";
import useStorageState from "./useStorageState/useStorageState";

const stringToNetwork = (network: RenNetwork): RenNetworkDetails => {
    switch (network.toLowerCase()) {
        case RenNetwork.Mainnet:
            return renMainnet;
        case RenNetwork.Testnet:
            return renTestnet;
        case RenNetwork.Localnet: //subgraphs not working
            return renLocalnet;
    }
    throw new Error(`Unknown network ${network}.`);
};

const useOnboard = (networkID: number) => {
    const [onboard, setOnboard] = useState<OnboardInstance | undefined>();
    const [walletAddress, setWalletAddress] = useState<string | null>(null);
    const [balance, setBalance] = useState<BigNumber | null>(null);

    const onBalance = (newBalance: string) =>
        setBalance(new BigNumber(newBalance));

    useEffect(() => {
        (async () => {
            const appName = "Command Center";
            const appUrl =
                networkID === 1
                    ? "mainnet.renproject.io"
                    : "testnet.renproject.io";
            const supportEmail = "support@renproject.io";

            const rpcUrl = EXTRA_WALLETS_INFURA_KEY;

            const isWebUSBSupported = navigator.platform.includes("Win")
                ? false
                : await LedgerTransportWebUSB.isSupported().catch(() => false);

            const LedgerTransport = isWebUSBSupported
                ? LedgerTransportWebUSB
                : LedgerTransportU2F;

            setOnboard(
                Onboard({
                    dappId: BLOCKNATIVE_KEY,
                    networkId: networkID,
                    darkMode: true,
                    subscriptions: {
                        address: setWalletAddress,
                        balance: onBalance,
                    },
                    walletSelect: {
                        wallets: [
                            { walletName: "coinbase", preferred: true },
                            {
                                walletName: "trust",
                                preferred: true,
                                rpcUrl: rpcUrl,
                            },
                            { walletName: "metamask", preferred: true },
                            {
                                walletName: "trezor",
                                appUrl: appUrl,
                                email: supportEmail,
                                rpcUrl: rpcUrl,
                            },
                            {
                                walletName: "ledger",
                                rpcUrl,
                                LedgerTransport,
                            },
                            {
                                walletName: "ledger",
                                label: "Ledger (legacy)",
                                rpcUrl,
                            },
                            { walletName: "gnosis" },
                            { walletName: "authereum" },
                            {
                                walletName: "lattice",
                                rpcUrl: rpcUrl,
                                appName: appName,
                            },
                            {
                                walletName: "cobovault",
                                rpcUrl: rpcUrl,
                                appName: appName,
                            },
                            // {
                            //   walletName: "fortmatic",
                            //   apiKey: FORTMATIC_KEY,
                            //   preferred: true
                            // },
                            {
                                walletName: "portis",
                                apiKey: PORTIS_KEY,
                                label: "Login with Email",
                            },
                            {
                                walletName: "walletConnect",
                                preferred: true,
                                infuraKey: INFURA_KEY,
                            },
                            { walletName: "opera" },
                            { walletName: "operaTouch" },
                            { walletName: "torus" },
                            { walletName: "status" },
                            {
                                walletName: "walletLink",
                                rpcUrl: rpcUrl,
                                appName: appName,
                            },
                            { walletName: "imToken", rpcUrl: rpcUrl },
                            { walletName: "meetone" },
                            { walletName: "mykey", rpcUrl: rpcUrl },
                            { walletName: "huobiwallet", rpcUrl: rpcUrl },
                            { walletName: "hyperpay" },
                            { walletName: "wallet.io", rpcUrl: rpcUrl },
                            { walletName: "atoken" },
                            { walletName: "frame" },
                            { walletName: "ownbit" },
                            { walletName: "alphawallet" },
                            { walletName: "xdefi" },
                            { walletName: "bitpie" },
                        ],
                    },
                    walletCheck: [
                        { checkName: "accounts" },
                        { checkName: "connect" },
                        { checkName: "network" },
                    ],
                }),
            );
        })().catch(console.error);
    }, [networkID]);

    return { onboard, walletAddress, balance };
};

const useNotify = (networkID: number) => {
    const [notify, setNotify] = useState<NotifyInstance | undefined>();

    useEffect(() => {
        setNotify(
            Notify({
                dappId: BLOCKNATIVE_KEY,
                networkId: networkID,
                darkMode: true,
                desktopPosition: "topRight",
            }),
        );
    }, [networkID]);

    return { notify };
};

const useWeb3Container = (initialState = RenNetwork.Testnet) => {
    const { setPopup, clearPopup } = PopupContainer.useContainer();

    const [renNetwork] = useState<RenNetworkDetails>(
        stringToNetwork(initialState),
    );
    const { onboard, balance, walletAddress } = useOnboard(
        renNetwork.networkID,
    );
    const { notify } = useNotify(renNetwork.networkID);

    const rpcUrl = `${renNetwork.infura}/v3/${INFURA_KEY}`;
    const [readonlyWeb3] = useState<Web3>(getReadOnlyWeb3(rpcUrl));
    const [web3, setWeb3] = useState<Web3>(readonlyWeb3);

    // Login data
    const [address, setAddress] = useState<string | null>(null);
    const [ensName, setEnsName] = useState<string | null>(null);
    const [web3BrowserName, setWeb3BrowserName] = useState(
        Web3Browser.Web3Browser,
    );

    // The following are almost opposites - except that they are both
    // initialized as false. LoggedInBefore means that we try to re-login again
    // when the page is loaded. Logged out means that we don't try to re-login.
    const [loggedInBefore, setLoggedInBefore] = useStorageState(
        localStorage,
        "loggedInBefore",
        false,
    );
    const [loggedOut, setLoggedOut] = useState(false);

    const logout = useCallback(() => {
        setWeb3(readonlyWeb3);
        setLoggedOut(true);
        setLoggedInBefore(false);

        if (onboard) {
            onboard.walletReset();
        }
    }, [onboard, readonlyWeb3, setLoggedInBefore]);

    const login = ({ newWeb3 }: { newWeb3: Web3 }) => {
        setWeb3(newWeb3);
        setLoggedOut(false);
        setLoggedInBefore(true);
    };

    const promptLogin = async (options: { manual: boolean }) => {
        if ((loggedOut && !options.manual) || !onboard) {
            return;
        }

        const walletSelected = await onboard.walletSelect();

        if (!walletSelected) {
            return;
        }

        const walletChecked = await onboard.walletCheck();

        if (!walletChecked) {
            return;
        }

        const newWeb3 = new Web3(onboard.getState().wallet.provider);

        // For now we use first account
        const defaultAddress = toChecksumAddress(onboard.getState().address);

        Sentry.configureScope((scope) => {
            // scope.setUser({ id: address });
            scope.setExtra("loggedIn", true);
        });

        // Store address in the store (and in local storage)
        login({ newWeb3 });

        const newWeb3BrowserName = getWeb3BrowserName(newWeb3.currentProvider);
        setWeb3BrowserName(newWeb3BrowserName);

        return defaultAddress;
    };

    useEffect(() => {
        if (!address) {
            setAddress(walletAddress);
            return;
        }

        if (walletAddress !== address) {
            const onClick = () => {
                setAddress(walletAddress);
                clearPopup();
            };
            const onCancel = () => {
                logout();
                clearPopup();
            };

            setPopup({
                popup: (
                    <LoggedOut
                        onConnect={onClick}
                        onCancel={onCancel}
                        newAddress={walletAddress}
                    />
                ),
                onCancel,
                dismissible: false,
                overlay: true,
            });
        }
    }, [walletAddress, address, clearPopup, logout, setPopup]);

    useEffect(() => {
        const resolveEnsAddress = async () => {
            if (address && web3.currentProvider) {
                const ens = new ENS({
                    provider: web3.currentProvider,
                    ensAddress: getEnsAddress("1"),
                });

                const ensName = await ens.getName(address);
                setEnsName(ensName.name);
            } else {
                setEnsName(null);
            }
        };

        resolveEnsAddress();
    }, [address, web3, setEnsName]);

    return {
        renNetwork,
        web3,
        setWeb3,
        address,
        ensName,
        balance,
        web3BrowserName,
        setWeb3BrowserName,
        loggedInBefore,
        setLoggedInBefore,
        loggedOut,
        setLoggedOut,
        notify,

        logout,
        promptLogin,
        // lookForLogout,
    };
};

export const Web3Container = createContainer(useWeb3Container);
