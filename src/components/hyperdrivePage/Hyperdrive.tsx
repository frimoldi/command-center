import { Loading, TokenIcon } from "@renproject/react-components";
import React, { useState } from "react";
import { withRouter } from "react-router";
import { CSSTransitionGroup } from "react-transition-group";

import { Token } from "../../lib/ethereum/tokens";
import { naturalTime } from "../../lib/general/conversion";
import { TokenBalance } from "../common/TokenBalance";
import { Block, HyperdriveContainer, Tx } from "./hyperdriveContainer";

let interval: NodeJS.Timeout;

export const renderTransaction = (tx: Tx): React.ReactNode => {
    // BTC
    if (tx.to === "BTC0Btc2Eth") {
        return <>Shift {tx.args[1].value / 10 ** 8} <TokenIcon token={Token.BTC} /> to <TokenIcon token={Token.ETH} /></>;
    }
    if (tx.to === "BTC0Eth2Btc") {
        return <>Shift {tx.args[2].value / 10 ** 8} <TokenIcon token={Token.BTC} /> from <TokenIcon token={Token.ETH} /></>;
    }
    // ZEC
    if (tx.to === "ZEC0Zec2Eth") {
        return <>Shift {tx.args[1].value / 10 ** 8} <TokenIcon token={Token.ZEC} /> to <TokenIcon token={Token.ETH} /></>;
    }
    if (tx.to === "ZEC0Eth2Zec") {
        return <>Shift {tx.args[2].value / 10 ** 8} <TokenIcon token={Token.ZEC} /> from <TokenIcon token={Token.ETH} /></>;
    }
    return <>
        {tx.to} {tx.args.length} {tx.out ? tx.out.length : 0}
    </>;
};

export const Hyperdrive = withRouter(({ match: { params }, history }) => {
    const container = HyperdriveContainer.useContainer();

    const blockNumber = params.blockNumber
        ? parseInt(params.blockNumber, 10)
        : null;

    // tslint:disable-next-line: prefer-const
    let [initialized, setInitialized] = useState(false);
    React.useEffect(() => {
        if (initialized) {
            return;
        }
        const syncBlocks = () => {
            container.updateBlocks().catch(console.error);
        };

        if (blockNumber) {
            container.getBlock(blockNumber).catch(console.error);
        }

        // Every 30 seconds
        if (interval) {
            clearInterval(interval);
        }
        interval = setInterval(syncBlocks, 10 * 1000);
        if (container.blocks.size === 0) {
            syncBlocks();
        }

        initialized = true;
        setInitialized(initialized);

        // return () => {
        //     console.log(`No more syncing!`);
        //     clearInterval(interval);
        // };
        // tslint:disable-next-line:react-hooks/exhaustive-dep
    }, [initialized, blockNumber]);

    const blockTr = (block: Block) => {
        const trOnClick = () => {
            container.getBlock(block.height).catch(console.error);
            history.push(`/hyperdrive/${block.height}`);
        };
        return (
            <tr key={block.height} onClick={trOnClick}>
                <td>{block.height}</td>
                <td>
                    {naturalTime(block.timestamp, {
                        message: "Just now",
                        suffix: "ago",
                        countDown: false,
                        showingSeconds: true
                    })}
                </td>
                <td className="block--txs--td">{block.txs.length ? <div className="block--txs">{block.txs.map((tx, index) => {
                    return <div className="block--tx" key={tx.hash}>
                        {renderTransaction(tx)}
                    </div>;
                })}</div> : <span className="block--txs--none">No TXs</span>}</td>
            </tr>
        );
    };

    const stat = (title: string, content: React.ReactNode) => <div>
        <hr />
        <h2>{title}</h2>
        <span className="hyperdrive--stat">{content}</span>
    </div>;

    const firstBlock = container.blocks.first<Block>();

    return (
        <div
            className="hyperdrive container"
            key={blockNumber === null ? undefined : blockNumber}
        >
            <div className="hyperdrive--row">
                {stat("Number of shards", 1)}
                {stat("Block height", firstBlock ? firstBlock.height : 0)}
                {stat("Locked BTC", <>
                    <TokenBalance
                        token={Token.BTC}
                        amount={String(
                            firstBlock ? firstBlock.utxosForBtc.reduce((sum, utxo) => sum + utxo.amount, 0) : 0
                        )}
                        digits={4}
                    />{" "}
                    BTC
                </>)}
                {stat("Locked ZEC", <>
                    <TokenBalance
                        token={Token.ZEC}
                        amount={String(
                            firstBlock ? firstBlock.utxosForZec.reduce((sum, utxo) => sum + utxo.amount, 0) : 0
                        )}
                        digits={4}
                    />{" "}
                    ZEC
                </>)}
            </div>
            {blockNumber ? (
                <>
                    <hr />
                    <h2>Block {blockNumber}</h2>
                    <table className="">
                        <thead>
                            <th>Block Number</th>
                            <th>Timestamp</th>
                            <th className="hyperdrive--table--txs">Transactions</th>
                        </thead>
                        <tbody>
                            {container.currentBlock && container.currentBlockNumber === blockNumber ? (
                                blockTr(container.currentBlock)
                            ) : (
                                    <Loading />
                                )}
                        </tbody>
                    </table>
                    {/* <table className="">
                        <thead>
                            <th>Hash</th>
                            <th>To</th>
                            <th>Args</th>
                            <th>Out</th>
                        </thead>
                        <tbody>
                            {container.currentBlock ? (
                                container.currentBlock.txs.map(tx => {
                                    return (
                                        <tr key={tx.hash}>
                                            <td>{tx.hash}</td>
                                            <td>{tx.to}</td>
                                            <td>{tx.args.length}</td>
                                            <td>{tx.out ? tx.out.length : 0}</td>
                                        </tr>
                                    );
                                })
                            ) : (
                                    <></>
                                )}
                        </tbody>
                    </table> */}
                    <br />
                    <br />
                </>
            ) : (
                    <></>
                )}
            <hr />
            <h2>Latest Blocks</h2>
            <table className="">
                <thead>
                    <th>Block Number</th>
                    <th>Timestamp</th>
                    <th className="hyperdrive--table--txs">Transactions</th>
                </thead>
                <CSSTransitionGroup transitionName="fade" component="tbody">
                    {container.blocks.map(blockTr)}
                </CSSTransitionGroup>
            </table>
        </div>
    );
});
