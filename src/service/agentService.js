import { db } from "../firebase"; // Adjusts based on your setup
import { doc, updateDoc, increment } from "firebase/firestore";

/**
 * Toggles an agent's main account lifecycle access status
 * @param {string} agentId - The target document ID inside echoagents
 * @param {boolean} isActive - The new target status boolean flag
 */
export const toggleAgentStatus = async (agentId, isActive) => {
  try {
    const agentRef = doc(db, "echoagents", agentId);
    await updateDoc(agentRef, {
      isActiveAgent: isActive,
    });
    console.log(`Agent ${agentId} status updated to: ${isActive}`);
  } catch (error) {
    console.error("Error toggling agent status:", error);
    throw error;
  }
};

/**
 * Executes an atomic increment adjustment on the target agent wallet account balance index
 * @param {string} agentId - The target document ID inside echoagents
 * @param {number} amount - Positive value to credit, or negative value to debit
 */
export const manualWalletTopUp = async (agentId, amount) => {
  try {
    const agentRef = doc(db, "echoagents", agentId);
    await updateDoc(agentRef, {
      walletBalance: increment(Number(amount)),
    });
    console.log(`Successfully modified agent wallet balance by: ${amount}`);
  } catch (error) {
    console.error("Error updating agent wallet:", error);
    throw error;
  }
};

/**
 * Mutates specific properties inside a deeply nested package map layout matrix paths
 * Handles updating 'costPrice', 'agentPrice', or any arbitrary parameter
 * @param {string} agentId - The target document ID inside echoagents
 * @param {string} network - The network key (e.g., 'mtnPackages', 'vodafonePackages', 'airteltigoPackages')
 * @param {string} packageKey - The package size key identifier (e.g., '10gb', '100gb')
 * @param {string} targetField - The precise key pointer (e.g., 'costPrice' or 'agentPrice')
 * @param {number} newValue - The incoming target numeric payload
 */
export const updatePackageCostPrice = async (
  agentId,
  network,
  packageKey,
  newValue,
  targetField = "costPrice", // Defaults to costPrice for backwards compatibility
) => {
  try {
    const agentRef = doc(db, "echoagents", agentId);

    // Dynamically structures pointing paths safely across schema definitions:
    // e.g., "airteltigoPackages.10gb.costPrice" OR "mtnPackages.100gb.agentPrice"
    const updatePath = `${network}.${packageKey}.${targetField}`;

    await updateDoc(agentRef, {
      [updatePath]: Number(newValue),
    });

    console.log(
      `Updated matrix entry [${network} -> ${packageKey} -> ${targetField}] to: ${newValue}`,
    );
  } catch (error) {
    console.error(`Error updating package attribute ${targetField}:`, error);
    throw error;
  }
};

/**
 * Modifies client-side storefront module visibility status tokens across selected nodes
 * @param {string} agentId - The target document ID inside echoagents
 * @param {string} network - Target network parent tree string identifier
 * @param {string} packageKey - Specific nested data object capacity index name
 * @param {boolean} isActive - Current operational visibility context token
 */
export const togglePackageVisibility = async (
  agentId,
  network,
  packageKey,
  isActive,
) => {
  try {
    const agentRef = doc(db, "echoagents", agentId);
    const updatePath = `${network}.${packageKey}.isActive`;

    await updateDoc(agentRef, {
      [updatePath]: isActive,
    });
    console.log(
      `Updated visibility for ${network} -> ${packageKey} to: ${isActive}`,
    );
  } catch (error) {
    console.error("Error toggling package visibility:", error);
    throw error;
  }
};
