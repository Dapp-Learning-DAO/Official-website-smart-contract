#!/bin/bash

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to run a script and check its result
run_script() {
    local script=$1
    local description=$2
    echo -e "${GREEN}Running $description...${NC}"
    npx hardhat run scripts/SharingWishVault/$script --network optimism-sepolia
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ $description completed successfully${NC}"
        echo "-----------------------------------"
    else
        echo -e "${RED}✗ $description failed${NC}"
        exit 1
    fi
    # Add a small delay between scripts
    sleep 2
}

# Main execution
echo "Starting SharingWishVault deployment and setup sequence..."
echo "====================================="

# Run each script in sequence
# run_script "0-deploy-mockerc20.js" "Mock ERC20 Token Deployment"
run_script "1-deploy.js" "SharingWishVault Contract Deployment"
run_script "2-add-allow-token.js" "Adding Allowed Tokens"
run_script "3-create-vault.js" "Creating Vault"
run_script "4-donate.js" "Making Donation"
run_script "5-settle.js" "Settling Vault"
run_script "6-claim.js" "Claiming Funds"
run_script "7-withdraw.js" "Withdrawing Funds"

echo -e "${GREEN}All scripts completed successfully!${NC}"
