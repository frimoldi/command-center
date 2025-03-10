import BigNumber from "bignumber.js";
import React, { useEffect, useMemo } from "react";

import { Loading } from "@renproject/react-components";

import {
    getAggregatedFeesCollection,
    getFeesCollection,
    getFundCollection,
} from "../../../lib/darknode/utils/feesUtils";
import { isDefined } from "../../../lib/general/isDefined";
import { multiplyTokenAmount } from "../../../lib/graphQL/queries/queries";
import { GithubAPIContainer } from "../../../store/githubApiContainer";
import { GraphContainer } from "../../../store/graphContainer";
import { MapContainer } from "../../../store/mapContainer";
import { NetworkContainer } from "../../../store/networkContainer";
import { Web3Container } from "../../../store/web3Container";
import { ReactComponent as IconDarknodesOnline } from "../../../styles/images/icon-darknodes-online.svg";
import { ReactComponent as IconIncome } from "../../../styles/images/icon-income.svg";
import { Change } from "../../../views/Change";
import { DarknodeMap } from "../../../views/darknodeMap/DarknodeMap";
import { EpochProgress } from "../../../views/EpochProgress";
import { ExternalLink } from "../../../views/ExternalLink";
import { Stat, Stats } from "../../../views/Stat";
import { updatePrices } from "../../common/tokenBalanceUtils";
import { mergeFees } from "../darknodePage/blocks/FeesBlockController";
import { OverviewDiv } from "./DarknodeStatsStyles";
import { FeesStat } from "./FeesStat";

const REN_TOTAL_SUPPLY = new BigNumber(1000000000);

export const DarknodeStatsPage = () => {
    const { renVM } = GraphContainer.useContainer();
    const {
        currentCycle,
        previousCycle,
        numberOfDarknodes,
        numberOfDarknodesLastEpoch,
        pendingRegistrations,
        pendingDeregistrations,
        minimumBond,
        timeUntilNextEpoch,
        timeSinceLastEpoch,
        minimumEpochInterval,
        fees,
    } = renVM || {};
    const {
        pendingRewards,
        blockState,
        quoteCurrency,
        pendingTotalInUsd,
        tokenPrices,
        fetchBlockState,
    } = NetworkContainer.useContainer();
    const { latestCLIVersion, latestCLIVersionDaysAgo } =
        GithubAPIContainer.useContainer();

    const { renNetwork } = Web3Container.useContainer();
    const { darknodes, fetchDarknodes } = MapContainer.useContainer();

    useEffect(() => {
        fetchBlockState().catch(console.error);

        const interval = setInterval(() => {
            fetchBlockState().catch(console.error);
        }, 180 * 1000);

        return () => clearInterval(interval);
    }, [fetchBlockState]);

    useEffect(() => {
        const fetchIPs = () => {
            fetchDarknodes().catch(console.error);
        };

        // Every two minutes
        const interval = setInterval(fetchIPs, 120 * 1000);
        if (darknodes.size === 0) {
            fetchIPs();
        }

        return () => {
            clearInterval(interval);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [renNetwork && renNetwork.name]);

    const currentNetworkRenVM = blockState
        ? updatePrices(getFeesCollection("current", blockState), tokenPrices)
        : null;
    const currentNetworkRenVmInUsd = currentNetworkRenVM
        ? currentNetworkRenVM.reduce(
              (sum, entry) =>
                  entry.amountInUsd
                      ? new BigNumber(sum || 0).plus(entry.amountInUsd)
                      : sum,
              undefined as BigNumber | undefined,
          )
        : currentNetworkRenVM;
    const previousNetworkRenVm = blockState
        ? updatePrices(getFeesCollection("previous", blockState), tokenPrices)
        : null;
    const previousNetworkRenVmInUsd = previousNetworkRenVm
        ? previousNetworkRenVm.reduce(
              (sum, entry) =>
                  entry.amountInUsd
                      ? new BigNumber(sum || 0).plus(entry.amountInUsd)
                      : sum,
              undefined as BigNumber | undefined,
          )
        : null;

    const current =
        (isDefined(currentCycle) &&
            pendingRewards.get(currentCycle, undefined)) ||
        undefined;
    const previous =
        (isDefined(previousCycle) &&
            pendingRewards.get(previousCycle, undefined)) ||
        undefined;

    const percent =
        numberOfDarknodes && minimumBond
            ? numberOfDarknodes
                  .times(minimumBond.div(new BigNumber(10).exponentiatedBy(18)))
                  .div(REN_TOTAL_SUPPLY)
                  .times(100)
                  .toNumber()
            : null;

    const totalFeesInUsd = fees
        ? fees.reduce(
              (sum, feeItem) => sum.plus(feeItem.amountInUsd),
              new BigNumber(0),
          )
        : null;
    const totalFeesRenVm = blockState
        ? updatePrices(getAggregatedFeesCollection(blockState), tokenPrices)
        : null;

    const totalFeesRenVmInUsd = totalFeesRenVm
        ? totalFeesRenVm.reduce(
              (sum, feeItem) => sum.plus(feeItem.amountInUsd),
              new BigNumber(0),
          )
        : null;
    const totalFeesInUsdMerged = totalFeesRenVmInUsd;
    // totalFeesRenVmInUsd
    // ? totalFeesRenVmInUsd.plus(totalFeesInUsd || 0)
    // : null;
    const totalFeesMerged = totalFeesRenVm;
    // fees && totalFeesRenVm
    //     ? mergeFees(totalFeesRenVm, fees)
    //     : totalFeesRenVm;

    const currentInUsd =
        currentCycle && pendingTotalInUsd.get(currentCycle, undefined);
    const previousInUsd =
        previousCycle && pendingTotalInUsd.get(previousCycle, undefined);
    const currentNetworkInUsd =
        currentInUsd && numberOfDarknodes
            ? currentInUsd.times(numberOfDarknodes)
            : undefined;
    const previousNetworkInUsd =
        previousInUsd && numberOfDarknodesLastEpoch
            ? previousInUsd.times(numberOfDarknodesLastEpoch)
            : undefined;

    const currentNetworkInUsdMerged =
        currentNetworkRenVmInUsd || currentNetworkInUsd
            ? new BigNumber(currentNetworkRenVmInUsd || 0).plus(
                  currentNetworkInUsd || 0,
              )
            : undefined;
    const previousNetworkInUsdMerged =
        previousNetworkRenVmInUsd || previousNetworkInUsd
            ? new BigNumber(previousNetworkRenVmInUsd || 0).plus(
                  previousNetworkInUsd || 0,
              )
            : undefined;

    const currentNetwork = useMemo(
        () =>
            current && numberOfDarknodes
                ? current.map((x) =>
                      !x ? x : multiplyTokenAmount(x, numberOfDarknodes),
                  )
                : undefined,
        [current, numberOfDarknodes],
    );

    const previousNetwork = useMemo(
        () =>
            previous && numberOfDarknodesLastEpoch
                ? previous.map((x) =>
                      !x
                          ? x
                          : multiplyTokenAmount(x, numberOfDarknodesLastEpoch),
                  )
                : undefined,
        [previous, numberOfDarknodesLastEpoch],
    );

    const currentNetworkMerged =
        currentNetwork && currentNetworkRenVM
            ? mergeFees(currentNetwork, currentNetworkRenVM)
            : currentNetworkRenVM;

    const previousNetworkMerged =
        previousNetwork && previousNetworkRenVm
            ? mergeFees(previousNetwork, previousNetworkRenVm)
            : previousNetworkRenVm;

    // Community fund
    const fundCollection = blockState
        ? updatePrices(getFundCollection(blockState), tokenPrices)
        : null;
    const fundCollectionInUsd = fundCollection
        ? fundCollection.reduce(
              (sum, entry) =>
                  entry.amountInUsd
                      ? new BigNumber(sum || 0).plus(entry.amountInUsd)
                      : sum,
              null as BigNumber | null,
          )
        : null;

    return (
        <OverviewDiv className="overview container">
            <Stat icon={<IconDarknodesOnline />} message="Darknodes online">
                <Stats>
                    <Stat
                        message="Registered"
                        big
                        infoLabel="The current number of registered Darknodes. The smaller number indicates the change in registrations last Epoch."
                    >
                        {isDefined(numberOfDarknodes) ? (
                            <>
                                <span className="stat-amount--value">
                                    {numberOfDarknodes.toFormat(0)}
                                </span>
                                {isDefined(numberOfDarknodesLastEpoch) ? (
                                    <Change
                                        className="stat--children--diff"
                                        change={numberOfDarknodes
                                            .minus(numberOfDarknodesLastEpoch)
                                            .toNumber()}
                                    />
                                ) : null}
                            </>
                        ) : (
                            <Loading alt={true} />
                        )}
                    </Stat>
                    <Stat
                        message="Change next Epoch"
                        big
                        infoLabel="The change in registrations at the beginning of the next Epoch."
                    >
                        {isDefined(pendingRegistrations) &&
                        isDefined(pendingDeregistrations) ? (
                            <>
                                <Change
                                    change={pendingRegistrations
                                        .minus(pendingDeregistrations)
                                        .toNumber()}
                                />
                                <Change
                                    className="stat--children--diff positive"
                                    prefix={"+"}
                                    change={pendingRegistrations.toNumber()}
                                />
                                <Change
                                    className="stat--children--diff negative"
                                    prefix={
                                        pendingDeregistrations.isZero()
                                            ? "-"
                                            : ""
                                    }
                                    change={new BigNumber(0)
                                        .minus(pendingDeregistrations)
                                        .toNumber()}
                                />
                            </>
                        ) : (
                            <Loading alt={true} />
                        )}
                    </Stat>
                    <Stat
                        message="% Ren Bonded"
                        big
                        infoLabel="Each Darknode is required to bond 100,000K REN to encourage good behavior. This number represents the percentage of the total amount of REN (1B) which is currently bonded."
                    >
                        {isDefined(percent) ? (
                            <>{percent}%</>
                        ) : (
                            <Loading alt={true} />
                        )}
                    </Stat>
                </Stats>
            </Stat>
            <Stat icon={<IconIncome />} message="Network rewards">
                <Stats style={{ flexWrap: "wrap" }}>
                    <FeesStat
                        fees={totalFeesMerged}
                        feesInUsd={totalFeesInUsdMerged}
                        message="Total network fees"
                        infoLabel="The fees paid to the network across all epochs, using the USD price at the time of the mint or burn."
                        quoteCurrency={quoteCurrency}
                        dark={true}
                    />
                    <FeesStat
                        fees={fundCollection}
                        feesInUsd={fundCollectionInUsd}
                        message="Community fund"
                        infoLabel="7.12% of rewards are collected towards a fund controlled by the Ren community."
                        quoteCurrency={quoteCurrency}
                        dark={true}
                    />
                    <FeesStat
                        fees={previousNetworkMerged}
                        feesInUsd={previousNetworkInUsdMerged}
                        message="Last cycle"
                        infoLabel="The amount of rewards earned by the entire network of Darknodes in the last Epoch."
                        quoteCurrency={quoteCurrency}
                        dark={true}
                    />
                    <FeesStat
                        fees={currentNetworkMerged}
                        feesInUsd={currentNetworkInUsdMerged}
                        message="Current cycle"
                        infoLabel="Rewards earned in this current Epoch so far by the entire Darknode network."
                        quoteCurrency={quoteCurrency}
                        dark={true}
                    />
                </Stats>
            </Stat>
            <div className="overview--bottom">
                <DarknodeMap darknodes={darknodes} />
                <Stats className="overview--bottom--right">
                    {/* <Stat message="All time total" big>$?</Stat> */}
                    <Stat
                        className="darknode-cli"
                        message="Reward Period/Epoch Ends"
                        highlight={true}
                        nested={true}
                        infoLabel={
                            <>
                                An Epoch is a recurring period of 28 days used
                                for Darknode registration and for distributing
                                rewards to Darknodes that have been active for
                                that entire Epoch.
                            </>
                        }
                    >
                        <EpochProgress
                            small={true}
                            timeSinceLastEpoch={timeSinceLastEpoch}
                            timeUntilNextEpoch={timeUntilNextEpoch}
                            minimumEpochInterval={minimumEpochInterval}
                        />
                    </Stat>
                    <Stat
                        message="Darknode CLI Information"
                        className="darknode-cli"
                        highlight={true}
                        nested={true}
                    >
                        <div className="darknode-cli--top">
                            <p>
                                Latest CLI Version <b>{latestCLIVersion}</b>
                            </p>
                            <p>
                                Version published{" "}
                                <b>{latestCLIVersionDaysAgo}</b>
                            </p>
                        </div>
                        <ExternalLink href="https://github.com/renproject/darknode-cli">
                            <button className="darknode-cli--button button">
                                Download CLI
                            </button>
                        </ExternalLink>
                    </Stat>
                </Stats>
            </div>
        </OverviewDiv>
    );
};
