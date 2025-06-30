// Global variables
let currentPlatforms = {};
let accountDetails = {
    idps: [],
    super: []
};
let expandedPlatforms = {};

// Number formatting function
function formatCurrency(number) {
    return new Intl.NumberFormat('en-AU', { 
        style: 'currency',
        currency: 'AUD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(number);
}

// Format number with commas
function formatNumber(number) {
    return new Intl.NumberFormat('en-AU').format(number);
}

// Add commas to input field as user types
function formatInputWithCommas(inputField) {
    // Get current caret position
    let caretPos = inputField.selectionStart;
    let oldLength = inputField.value.length;
    
    // Get value without commas
    let value = inputField.value.replace(/,/g, '');
    
    // Don't format if empty
    if (value === '') return;
    
    // Convert to number and format with commas
    let number = parseFloat(value);
    if (isNaN(number)) {
        inputField.value = '';
        return;
    }
    
    // Format with commas
    let formattedValue = formatNumber(number);
    
    // Update input value
    inputField.value = formattedValue;
    
    // Adjust caret position if needed
    let newLength = inputField.value.length;
    let lengthDiff = newLength - oldLength;
    inputField.setSelectionRange(caretPos + lengthDiff, caretPos + lengthDiff);
}

// Handle input field changes
function handleInputChange(event) {
    const input = event.target;
    formatInputWithCommas(input);
    
    // Extract the account type and index from the input ID
    const idParts = input.id.split('-');
    const accountType = idParts[0]; // 'idps' or 'super'
    const accountIndex = parseInt(idParts[2]) - 1;
    
    // Update account balance (strip commas first)
    const rawValue = input.value.replace(/,/g, '');
    updateAccountDetails(accountType, accountIndex, 'balance', rawValue);
}

// Global data structures with updated fee methodologies
const productFees = {
    "BT Panorama (Compact Menu)": {
        adminFee: function(totalBalance, accountBalance, accountType, allAccounts) {
            // Fixed fee per account
            let fee = 180;
            
            // Calculate total BT balance (combine IDPS and Super)
            let totalBTBalance = 0;
            allAccounts.idps.forEach(account => totalBTBalance += account.balance);
            allAccounts.super.forEach(account => totalBTBalance += account.balance);
            
            // Calculate percentage component based on total balance across all BT accounts
            let percentageFee = 0;
            if (totalBTBalance <= 1000000) {
                percentageFee = totalBTBalance * 0.0015;
            } else {
                percentageFee = 1000000 * 0.0015;
            }
            
            // Allocate percentage fee proportionally based on account balance
            if (totalBTBalance > 0) {
                fee += (accountBalance / totalBTBalance) * percentageFee;
            }
            
            return fee;
        },
        expenseFee: function(accountBalance) {
            // $95 fixed plus 0.03% of account balance, per account
            return 95 + (accountBalance * 0.0003);
        }
    },
    "BT Panorama (Full Menu)": {
        adminFee: function(totalBalance, accountBalance, accountType, allAccounts) {
            // Fixed fee per account
            let fee = 540;
            
            // Calculate total BT balance (combine IDPS and Super)
            let totalBTBalance = 0;
            allAccounts.idps.forEach(account => totalBTBalance += account.balance);
            allAccounts.super.forEach(account => totalBTBalance += account.balance);
            
            // Calculate percentage component based on total balance across all BT accounts
            let percentageFee = 0;
            if (totalBTBalance <= 1000000) {
                percentageFee = totalBTBalance * 0.0015;
            } else {
                percentageFee = 1000000 * 0.0015;
            }
            
            // Allocate percentage fee proportionally based on account balance
            if (totalBTBalance > 0) {
                fee += (accountBalance / totalBTBalance) * percentageFee;
            }
            
            return fee;
        },
        expenseFee: function(accountBalance) {
            // $95 fixed plus 0.03% of account balance, per account
            return 95 + (accountBalance * 0.0003);
        }
    },
    "Centric": {
        adminFee: function(totalBalance, accountBalance, accountType) {
            // Fixed $450 fee per account for IDPS
            return 450;
        },
        expenseFee: function(accountBalance) {
            // No expense recovery fees for IDPS Centric
            return 0;
        }
    },
    "Centric Choice": {
        adminFee: function(totalBalance, accountBalance, accountType) {
            // Fixed $528 admin fee per account
            return 528;
        },
        expenseFee: function(accountBalance) {
            // Fixed $132 expense recovery fee per account
            return 132;
        }
    },
    "Centric One": {
        adminFee: function(totalBalance, accountBalance, accountType) {
            // 0.2583% of account balance per account
            return accountBalance * 0.002583;
        },
        expenseFee: function(accountBalance) {
            // No expense recovery fee
            return 0;
        }
    },
    "Portfolio Solutions": {
        adminFee: function(totalBalance, accountBalance, accountType) {
            let fee = 0;
            
            if (accountType === 'super') {
                // Tiered fee structure for Super/Pension per account
                if (accountBalance <= 84000) {
                    fee = accountBalance * 0.008929;
                } else if (accountBalance <= 300000) {
                    fee = 84000 * 0.008929 + 0; // Next 216,000 is NIL
                } else if (accountBalance <= 850000) {
                    fee = 84000 * 0.008929 + 0 + (accountBalance - 300000) * 0.0025;
                } else {
                    fee = 84000 * 0.008929 + 0 + 550000 * 0.0025 + 0; // Balance over 850K is 0%
                }
                
                // Minimum fee of $45 per month ($540 per year) applies
                fee = Math.max(fee, 540);
            } else {
                // For IDPS accounts - using the original fee structure as it wasn't updated
                if (accountBalance >= 1000000) {
                    fee = 2125; // Flat fee for balances over $1M
                } else {
                    if (accountBalance <= 84000) {
                        fee = accountBalance * 0.008929;
                    } else if (accountBalance <= 300000) {
                        fee = 84000 * 0.008929 + (Math.min(accountBalance, 300000) - 84000) * 0.00625;
                    } else if (accountBalance <= 500000) {
                        fee = 84000 * 0.008929 + 216000 * 0.00625 + (Math.min(accountBalance, 500000) - 300000) * 0.00375;
                    } else if (accountBalance <= 1000000) {
                        fee = 84000 * 0.008929 + 216000 * 0.00625 + 200000 * 0.00375 + (Math.min(accountBalance, 1000000) - 500000) * 0.00225;
                    }
                }
            }
            
            return fee;
        },
        expenseFee: function(accountBalance, accountType) {
            // $155 per annum fixed plus 0.03% of account balance per account
            return 155 + (accountBalance * 0.0003);
        }
    },
    "CFS Edge Super": {
        adminFee: function(totalBalance, accountBalance, accountType) {
            // Apply fee structure per account
            let fee = 0;
            
            // First $500,000 at 0.28%
            if (accountBalance <= 500000) {
                fee = accountBalance * 0.0028;
            } else {
                fee = 500000 * 0.0028;
                
                // Next $500,000 at 0.13%
                if (accountBalance <= 1000000) {
                    fee += (accountBalance - 500000) * 0.0013;
                } else {
                    fee += 500000 * 0.0013;
                    
                    // Next $2,000,000 at 0.05%
                    if (accountBalance <= 3000000) {
                        fee += (accountBalance - 1000000) * 0.0005;
                    } else {
                        fee += 2000000 * 0.0005;
                        // Amounts above $3,000,000 at 0%
                    }
                }
            }
            
            return fee;
        },
        expenseFee: function(accountBalance) {
            // No expense recovery fee
            return 0;
        }
    },
    "CFS Edge": {
        adminFee: function(totalBalance, accountBalance, accountType) {
            // This is a placeholder - actual calculation will use CFS Edge Investment or CFS Edge Super
            return 0;
        },
        expenseFee: function(accountBalance) {
            return 0;
        }
    },
    "CFS Edge Investment": {
        adminFee: function(totalBalance, accountBalance, accountType) {
            // Apply fee structure per account
            let fee = 0;
            
            // First $500,000 at 0.25%
            if (accountBalance <= 500000) {
                fee = accountBalance * 0.0025;
            } else {
                fee = 500000 * 0.0025;
                
                // Next $500,000 at 0.10%
                if (accountBalance <= 1000000) {
                    fee += (accountBalance - 500000) * 0.0010;
                } else {
                    fee += 500000 * 0.0010;
                    
                    // Next $2,000,000 at 0.05%
                    if (accountBalance <= 3000000) {
                        fee += (accountBalance - 1000000) * 0.0005;
                    } else {
                        fee += 2000000 * 0.0005;
                        // Amounts above $3,000,000 at 0%
                    }
                }
            }
            
            return fee;
        },
        expenseFee: function(accountBalance) {
            // No expense recovery fee
            return 0;
        }
    }
};

// Calculate detailed fee breakdown for a platform and account
function calculateDetailedFeeBreakdown(platform, accountBalance, accountType, allAccounts) {
    let breakdown = {
        adminFeeComponents: [],
        expenseFeeComponents: [],
        totalAdminFee: 0,
        totalExpenseFee: 0
    };
    
    // Get the appropriate platform for the account type
    let platformToUse = platform;
    if (platform === "CFS Edge Super" && accountType === 'idps') {
        platformToUse = "CFS Edge Investment";
    } else if (platform === "CFS Edge" && accountType === 'idps') {
        platformToUse = "CFS Edge Investment";
    } else if (platform === "CFS Edge Investment" && accountType === 'super') {
        platformToUse = "CFS Edge Super";
    } else if (platform === "CFS Edge" && accountType === 'super') {
        platformToUse = "CFS Edge Super";
    } else if (platform === "Centric" && accountType === 'super') {
        platformToUse = "Centric Choice";
    } else if (platform === "Centric One" && accountType === 'idps') {
        return breakdown; // Centric One not available for IDPS
    }
    
    // Calculate admin fee with breakdown
    if (platformToUse === "BT Panorama (Compact Menu)" || platformToUse === "BT Panorama (Full Menu)") {
        const fixedFee = platformToUse === "BT Panorama (Compact Menu)" ? 180 : 540;
        breakdown.adminFeeComponents.push({
            description: "Fixed annual fee",
            amount: fixedFee
        });
        
        // Calculate total BT balance
        let totalBTBalance = 0;
        allAccounts.idps.forEach(account => totalBTBalance += account.balance);
        allAccounts.super.forEach(account => totalBTBalance += account.balance);
        
        // Calculate percentage component
        let percentageFee = 0;
        if (totalBTBalance <= 1000000) {
            percentageFee = totalBTBalance * 0.0015;
            breakdown.adminFeeComponents.push({
                description: `0.15% on total balance of ${formatCurrency(totalBTBalance)}`,
                amount: percentageFee * (accountBalance / totalBTBalance)
            });
        } else {
            percentageFee = 1000000 * 0.0015;
            breakdown.adminFeeComponents.push({
                description: `0.15% on first $1,000,000 (proportional share)`,
                amount: percentageFee * (accountBalance / totalBTBalance)
            });
        }
        
        breakdown.totalAdminFee = fixedFee + (percentageFee * (accountBalance / totalBTBalance));
        
    } else if (platformToUse === "Centric") {
        breakdown.adminFeeComponents.push({
            description: "Fixed annual fee",
            amount: 450
        });
        breakdown.totalAdminFee = 450;
        
    } else if (platformToUse === "Centric Choice") {
        breakdown.adminFeeComponents.push({
            description: "Fixed annual fee",
            amount: 528
        });
        breakdown.totalAdminFee = 528;
        
    } else if (platformToUse === "Centric One") {
        const fee = accountBalance * 0.002583;
        breakdown.adminFeeComponents.push({
            description: `0.2583% of balance ${formatCurrency(accountBalance)}`,
            amount: fee
        });
        breakdown.totalAdminFee = fee;
        
    } else if (platformToUse === "Portfolio Solutions") {
        if (accountType === 'super') {
            // Super/Pension tiered structure
            if (accountBalance <= 84000) {
                const fee = accountBalance * 0.008929;
                breakdown.adminFeeComponents.push({
                    description: `0.8929% on ${formatCurrency(accountBalance)}`,
                    amount: fee
                });
                breakdown.totalAdminFee = fee;
            } else if (accountBalance <= 300000) {
                const tier1 = 84000 * 0.008929;
                breakdown.adminFeeComponents.push({
                    description: "0.8929% on first $84,000",
                    amount: tier1
                });
                breakdown.adminFeeComponents.push({
                    description: `0% on next $${formatNumber(accountBalance - 84000)}`,
                    amount: 0
                });
                breakdown.totalAdminFee = tier1;
            } else if (accountBalance <= 850000) {
                const tier1 = 84000 * 0.008929;
                const tier3 = (accountBalance - 300000) * 0.0025;
                breakdown.adminFeeComponents.push({
                    description: "0.8929% on first $84,000",
                    amount: tier1
                });
                breakdown.adminFeeComponents.push({
                    description: "0% on next $216,000",
                    amount: 0
                });
                breakdown.adminFeeComponents.push({
                    description: `0.25% on next $${formatNumber(accountBalance - 300000)}`,
                    amount: tier3
                });
                breakdown.totalAdminFee = tier1 + tier3;
            } else {
                const tier1 = 84000 * 0.008929;
                const tier3 = 550000 * 0.0025;
                breakdown.adminFeeComponents.push({
                    description: "0.8929% on first $84,000",
                    amount: tier1
                });
                breakdown.adminFeeComponents.push({
                    description: "0% on next $216,000",
                    amount: 0
                });
                breakdown.adminFeeComponents.push({
                    description: "0.25% on next $550,000",
                    amount: tier3
                });
                breakdown.adminFeeComponents.push({
                    description: `0% on balance above $850,000`,
                    amount: 0
                });
                breakdown.totalAdminFee = tier1 + tier3;
            }
            
            // Apply minimum fee
            if (breakdown.totalAdminFee < 540) {
                breakdown.adminFeeComponents = [{
                    description: "Minimum annual fee ($45/month)",
                    amount: 540
                }];
                breakdown.totalAdminFee = 540;
            }
        } else {
            // IDPS fee structure
            if (accountBalance >= 1000000) {
                breakdown.adminFeeComponents.push({
                    description: "Flat fee for balances over $1M",
                    amount: 2125
                });
                breakdown.totalAdminFee = 2125;
            } else {
                // Calculate tiered fees
                if (accountBalance <= 84000) {
                    const fee = accountBalance * 0.008929;
                    breakdown.adminFeeComponents.push({
                        description: `0.8929% on ${formatCurrency(accountBalance)}`,
                        amount: fee
                    });
                    breakdown.totalAdminFee = fee;
                } else {
                    const tier1 = 84000 * 0.008929;
                    breakdown.adminFeeComponents.push({
                        description: "0.8929% on first $84,000",
                        amount: tier1
                    });
                    breakdown.totalAdminFee = tier1;
                    
                    if (accountBalance > 84000 && accountBalance <= 300000) {
                        const tier2 = (accountBalance - 84000) * 0.00625;
                        breakdown.adminFeeComponents.push({
                            description: `0.625% on next $${formatNumber(accountBalance - 84000)}`,
                            amount: tier2
                        });
                        breakdown.totalAdminFee += tier2;
                    } else if (accountBalance > 300000) {
                        const tier2 = 216000 * 0.00625;
                        breakdown.adminFeeComponents.push({
                            description: "0.625% on next $216,000",
                            amount: tier2
                        });
                        breakdown.totalAdminFee += tier2;
                        
                        if (accountBalance <= 500000) {
                            const tier3 = (accountBalance - 300000) * 0.00375;
                            breakdown.adminFeeComponents.push({
                                description: `0.375% on next $${formatNumber(accountBalance - 300000)}`,
                                amount: tier3
                            });
                            breakdown.totalAdminFee += tier3;
                        } else {
                            const tier3 = 200000 * 0.00375;
                            breakdown.adminFeeComponents.push({
                                description: "0.375% on next $200,000",
                                amount: tier3
                            });
                            breakdown.totalAdminFee += tier3;
                            
                            const tier4 = (accountBalance - 500000) * 0.00225;
                            breakdown.adminFeeComponents.push({
                                description: `0.225% on next $${formatNumber(accountBalance - 500000)}`,
                                amount: tier4
                            });
                            breakdown.totalAdminFee += tier4;
                        }
                    }
                }
            }
        }
        
    } else if (platformToUse === "CFS Edge Super") {
        // Tiered structure
        if (accountBalance <= 500000) {
            const fee = accountBalance * 0.0028;
            breakdown.adminFeeComponents.push({
                description: `0.28% on ${formatCurrency(accountBalance)}`,
                amount: fee
            });
            breakdown.totalAdminFee = fee;
        } else {
            const tier1 = 500000 * 0.0028;
            breakdown.adminFeeComponents.push({
                description: "0.28% on first $500,000",
                amount: tier1
            });
            breakdown.totalAdminFee = tier1;
            
            if (accountBalance <= 1000000) {
                const tier2 = (accountBalance - 500000) * 0.0013;
                breakdown.adminFeeComponents.push({
                    description: `0.13% on next $${formatNumber(accountBalance - 500000)}`,
                    amount: tier2
                });
                breakdown.totalAdminFee += tier2;
            } else {
                const tier2 = 500000 * 0.0013;
                breakdown.adminFeeComponents.push({
                    description: "0.13% on next $500,000",
                    amount: tier2
                });
                breakdown.totalAdminFee += tier2;
                
                if (accountBalance <= 3000000) {
                    const tier3 = (accountBalance - 1000000) * 0.0005;
                    breakdown.adminFeeComponents.push({
                        description: `0.05% on next $${formatNumber(accountBalance - 1000000)}`,
                        amount: tier3
                    });
                    breakdown.totalAdminFee += tier3;
                } else {
                    const tier3 = 2000000 * 0.0005;
                    breakdown.adminFeeComponents.push({
                        description: "0.05% on next $2,000,000",
                        amount: tier3
                    });
                    breakdown.totalAdminFee += tier3;
                    
                    breakdown.adminFeeComponents.push({
                        description: `0% on balance above $3,000,000`,
                        amount: 0
                    });
                }
            }
        }
        
    } else if (platformToUse === "CFS Edge Investment") {
        // Tiered structure
        if (accountBalance <= 500000) {
            const fee = accountBalance * 0.0025;
            breakdown.adminFeeComponents.push({
                description: `0.25% on ${formatCurrency(accountBalance)}`,
                amount: fee
            });
            breakdown.totalAdminFee = fee;
        } else {
            const tier1 = 500000 * 0.0025;
            breakdown.adminFeeComponents.push({
                description: "0.25% on first $500,000",
                amount: tier1
            });
            breakdown.totalAdminFee = tier1;
            
            if (accountBalance <= 1000000) {
                const tier2 = (accountBalance - 500000) * 0.0010;
                breakdown.adminFeeComponents.push({
                    description: `0.10% on next $${formatNumber(accountBalance - 500000)}`,
                    amount: tier2
                });
                breakdown.totalAdminFee += tier2;
            } else {
                const tier2 = 500000 * 0.0010;
                breakdown.adminFeeComponents.push({
                    description: "0.10% on next $500,000",
                    amount: tier2
                });
                breakdown.totalAdminFee += tier2;
                
                if (accountBalance <= 3000000) {
                    const tier3 = (accountBalance - 1000000) * 0.0005;
                    breakdown.adminFeeComponents.push({
                        description: `0.05% on next $${formatNumber(accountBalance - 1000000)}`,
                        amount: tier3
                    });
                    breakdown.totalAdminFee += tier3;
                } else {
                    const tier3 = 2000000 * 0.0005;
                    breakdown.adminFeeComponents.push({
                        description: "0.05% on next $2,000,000",
                        amount: tier3
                    });
                    breakdown.totalAdminFee += tier3;
                    
                    breakdown.adminFeeComponents.push({
                        description: `0% on balance above $3,000,000`,
                        amount: 0
                    });
                }
            }
        }
    }
    
    // Calculate expense fee breakdown
    if (platformToUse === "BT Panorama (Compact Menu)" || platformToUse === "BT Panorama (Full Menu)") {
        breakdown.expenseFeeComponents.push({
            description: "Fixed expense recovery fee",
            amount: 95
        });
        const percentageFee = accountBalance * 0.0003;
        breakdown.expenseFeeComponents.push({
            description: `0.03% of balance ${formatCurrency(accountBalance)}`,
            amount: percentageFee
        });
        breakdown.totalExpenseFee = 95 + percentageFee;
        
    } else if (platformToUse === "Centric Choice") {
        breakdown.expenseFeeComponents.push({
            description: "Fixed expense recovery fee",
            amount: 132
        });
        breakdown.totalExpenseFee = 132;
        
    } else if (platformToUse === "Portfolio Solutions") {
        breakdown.expenseFeeComponents.push({
            description: "Fixed expense recovery fee",
            amount: 155
        });
        const percentageFee = accountBalance * 0.0003;
        breakdown.expenseFeeComponents.push({
            description: `0.03% of balance ${formatCurrency(accountBalance)}`,
            amount: percentageFee
        });
        breakdown.totalExpenseFee = 155 + percentageFee;
        
    } else {
        // No expense fees for Centric, Centric One, CFS Edge platforms
        breakdown.totalExpenseFee = 0;
    }
    
    return breakdown;
}

// Toggle fee details display
function toggleFeeDetails(platformId) {
    const detailsRow = document.getElementById(`details-${platformId}`);
    const expandIcon = document.getElementById(`expand-${platformId}`);
    
    if (detailsRow) {
        detailsRow.classList.toggle('hidden');
        expandIcon.textContent = detailsRow.classList.contains('hidden') ? '▶' : '▼';
    }
}

// Update accounts visibility based on selections
function updateAccountsVisibility() {
    try {
        const idpsAccountCount = document.getElementById('idps-account-count');
        const superAccountCount = document.getElementById('super-account-count');
        
        if (!idpsAccountCount || !superAccountCount) {
            console.error("Account count elements not found");
            return;
        }
        
        const idpsCount = parseInt(idpsAccountCount.value);
        const superCount = parseInt(superAccountCount.value);
        
        // Clear tables
        const idpsTableBody = document.querySelector('#idps-accounts-table tbody');
        const superTableBody = document.querySelector('#super-accounts-table tbody');
        
        if (!idpsTableBody || !superTableBody) {
            console.error("Table body elements not found");
            return;
        }
        
        idpsTableBody.innerHTML = '';
        superTableBody.innerHTML = '';
        
        // Reset account details
        accountDetails = {
            idps: Array(idpsCount).fill().map(() => ({ balance: 0 })),
            super: Array(superCount).fill().map(() => ({ balance: 0 }))
        };
        
        // Show/hide IDPS section
        const idpsSection = document.getElementById('idps-section');
        if (idpsSection) {
            idpsSection.style.display = idpsCount > 0 ? 'block' : 'none';
        }
        
        // Show/hide Super section
        const superSection = document.getElementById('super-section');
        if (superSection) {
            superSection.style.display = superCount > 0 ? 'block' : 'none';
        }
        
        // Add IDPS accounts
        for (let i = 1; i <= idpsCount; i++) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>IDPS Account ${i}</td>
                <td><input type="text" id="idps-balance-${i}" class="input-field" value="0" oninput="handleInputChange(event)"></td>
            `;
            idpsTableBody.appendChild(row);
        }
        
        // Add Super accounts
        for (let i = 1; i <= superCount; i++) {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>Super/Pension Account ${i}</td>
                <td><input type="text" id="super-balance-${i}" class="input-field" value="0" oninput="handleInputChange(event)"></td>
            `;
            superTableBody.appendChild(row);
        }
        
        // Calculate totals and update footer
        let idpsTotalBalance = 0;
        let superTotalBalance = 0;
        
        accountDetails.idps.forEach(account => {
            idpsTotalBalance += account.balance;
        });
        
        accountDetails.super.forEach(account => {
            superTotalBalance += account.balance;
        });
        
        // Show/hide and update IDPS totals
        const idpsTotals = document.getElementById('idps-totals');
        const idpsTotalBalanceCell = document.getElementById('idps-total-balance');
        
        if (idpsTotals && idpsTotalBalanceCell) {
            if (idpsCount > 1) {
                idpsTotals.style.display = 'table-row-group';
                idpsTotalBalanceCell.textContent = formatCurrency(idpsTotalBalance);
            } else {
                idpsTotals.style.display = 'none';
            }
        }
        
        // Show/hide and update Super totals
        const superTotals = document.getElementById('super-totals');
        const superTotalBalanceCell = document.getElementById('super-total-balance');
        
        if (superTotals && superTotalBalanceCell) {
            if (superCount > 1) {
                superTotals.style.display = 'table-row-group';
                superTotalBalanceCell.textContent = formatCurrency(superTotalBalance);
            } else {
                superTotals.style.display = 'none';
            }
        }
        
        // Initialize account input fields with formatted zeros
        document.querySelectorAll('.input-field[id^="idps-balance-"], .input-field[id^="super-balance-"]').forEach(input => {
            input.value = "0";
        });
        
        // Calculate after all DOM updates
        calculate();
    } catch (error) {
        console.error("Error in updateAccountsVisibility:", error);
    }
}

// Update account details and recalculate
function updateAccountDetails(type, index, field, value) {
    try {
        value = parseFloat(value) || 0;
        accountDetails[type][index][field] = value;
        calculate();
    } catch (error) {
        console.error("Error in updateAccountDetails:", error);
    }
}

// Toggle Current Platform Selector
function toggleCurrentPlatformSelector() {
    try {
        const setCurrentPlatform = document.getElementById('set-current-platform');
        const currentPlatformSelector = document.getElementById('current-platform-selector');
        
        if (!setCurrentPlatform || !currentPlatformSelector) {
            console.error("Required elements not found for toggleCurrentPlatformSelector");
            return;
        }
        
        const isEnabled = setCurrentPlatform.value === 'yes';
        currentPlatformSelector.classList.toggle('hidden', !isEnabled);
        
        if (isEnabled) {
            populatePlatformCheckboxes();
        }
    } catch (error) {
        console.error("Error in toggleCurrentPlatformSelector:", error);
    }
}

// Populate platform checkboxes
function populatePlatformCheckboxes() {
    try {
        const checkboxesContainer = document.getElementById('platform-checkboxes');
        
        if (!checkboxesContainer) {
            console.error("platform-checkboxes element not found");
            return;
        }
        
        checkboxesContainer.innerHTML = '';
        
        // Get all platform names
        const platforms = Object.keys(productFees);
        
        // Add checkbox for each platform
        platforms.forEach(platform => {
            const checkboxDiv = document.createElement('div');
            checkboxDiv.style.marginBottom = '0.5rem';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = `platform-checkbox-${platform.replace(/\s+/g, '-').replace(/\(/g, '').replace(/\)/g, '')}`;
            checkbox.className = 'platform-checkbox';
            checkbox.value = platform;
            checkbox.checked = currentPlatforms[platform] || false;
            
            const label = document.createElement('label');
            label.htmlFor = checkbox.id;
            label.textContent = platform;
            label.style.marginLeft = '0.5rem';
            label.style.color = 'var(--text-primary)';
            
            checkboxDiv.appendChild(checkbox);
            checkboxDiv.appendChild(label);
            checkboxesContainer.appendChild(checkboxDiv);
        });
    } catch (error) {
        console.error("Error in populatePlatformCheckboxes:", error);
    }
}

// Save current platforms
function saveCurrentPlatforms() {
    try {
        // Reset current platforms
        currentPlatforms = {};
        
        // Get all checked platforms
        const checkboxes = document.querySelectorAll('.platform-checkbox:checked');
        checkboxes.forEach(checkbox => {
            currentPlatforms[checkbox.value] = true;
        });
        
        // Show save confirmation
        showSaveConfirmation();
        
        // Recalculate to update display
        calculate();
    } catch (error) {
        console.error("Error in saveCurrentPlatforms:", error);
    }
}

// Show save confirmation
function showSaveConfirmation() {
    try {
        // Create modal backdrop
        const backdrop = document.createElement('div');
        backdrop.style.position = 'fixed';
        backdrop.style.top = '0';
        backdrop.style.left = '0';
        backdrop.style.right = '0';
        backdrop.style.bottom = '0';
        backdrop.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
        backdrop.style.display = 'flex';
        backdrop.style.justifyContent = 'center';
        backdrop.style.alignItems = 'center';
        backdrop.style.zIndex = '1000';
        
        // Create modal content
        const modal = document.createElement('div');
        modal.style.backgroundColor = 'var(--dark-surface)';
        modal.style.padding = '2rem';
        modal.style.borderRadius = '8px';
        modal.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.5)';
        modal.style.textAlign = 'center';
        modal.style.maxWidth = '400px';
        
        // Add content
        const title = document.createElement('h3');
        title.textContent = 'Selected Platform(s) Saved';
        title.style.marginTop = '0';
        
        const message = document.createElement('p');
        message.textContent = 'Your selection has been saved and the comparison table has been updated.';
        
        const button = document.createElement('button');
        button.textContent = 'OK';
        button.className = 'toggle-button';
        button.style.marginTop = '1rem';
        button.onclick = function() {
            document.body.removeChild(backdrop);
        };
        
        // Assemble modal
        modal.appendChild(title);
        modal.appendChild(message);
        modal.appendChild(button);
        backdrop.appendChild(modal);
        
        // Add to document
        document.body.appendChild(backdrop);
        
        // Auto close after 3 seconds
        setTimeout(function() {
            if (document.body.contains(backdrop)) {
                document.body.removeChild(backdrop);
            }
        }, 3000);
    } catch (error) {
        console.error("Error in showSaveConfirmation:", error);
    }
}

// Toggle custom text field based on preference selection
function toggleCustomText() {
    try {
        const preference = document.getElementById('platform-preference');
        const customTextContainer = document.getElementById('custom-text-container');
        const noOnlineText = document.getElementById('no-online-text');
        
        if (!preference || !customTextContainer || !noOnlineText) {
            console.error("Required elements not found for toggleCustomText");
            return;
        }
        
        const preferenceValue = preference.value;
        customTextContainer.classList.toggle('hidden', preferenceValue !== 'custom');
        noOnlineText.classList.toggle('hidden', preferenceValue !== 'no-online');
    } catch (error) {
        console.error("Error in toggleCustomText:", error);
    }
}

// Download comparison data as CSV (Excel)
function downloadComparison() {
    try {
        // Get table data
        const table = document.getElementById('fee-comparison-table');
        if (!table) {
            console.error("Fee comparison table not found");
            return;
        }
        
        const rows = table.querySelectorAll('tr');
        
        // Create CSV content
        let csvContent = "Platform,Admin Fee,Expense Recovery,Total Fee\n";
        
        rows.forEach(row => {
            // Skip detail rows
            if (row.classList.contains('fee-details-row')) return;
            
            const cells = row.querySelectorAll('td');
            if (cells.length > 0) {
                // Check if it's a regular platform row
                const platformCell = cells[0].querySelector('.platform-name');
                if (platformCell) {
                    const rowData = [
                        platformCell.textContent.trim(),
                        cells[1].textContent.trim().replace('$', '').replace(',', ''),
                        cells[2].textContent.trim().replace('$', '').replace(',', ''),
                        cells[3].textContent.trim().replace('$', '').replace(',', '')
                    ];
                    csvContent += rowData.join(',') + '\n';
                }
            }
        });
        
        // Create and download the file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        
        link.setAttribute('href', url);
        link.setAttribute('download', 'Platform_Fee_Comparison.csv');
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) {
        console.error("Error in downloadComparison:", error);
    }
}

// Download comparison as PDF
function downloadPDF() {
    try {
        // Show loading indication on the button
        const downloadPdfBtn = document.getElementById('download-pdf');
        const originalText = downloadPdfBtn.innerHTML;
        downloadPdfBtn.innerHTML = 'Generating PDF...';
        downloadPdfBtn.disabled = true;

        // Create new jsPDF instance
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        // Set font styles
        doc.setFont('helvetica');
        
        // Add title
        doc.setFontSize(20);
        doc.setTextColor(40, 40, 40);
        doc.text('Platform Fee Comparison Report', doc.internal.pageSize.getWidth() / 2, 20, { align: 'center' });
        
        // Add subtitle
        doc.setFontSize(12);
        doc.setTextColor(100, 100, 100);
        doc.text('Financial Planning Analysis', doc.internal.pageSize.getWidth() / 2, 28, { align: 'center' });
        
        // Add horizontal line
        doc.setDrawColor(68, 114, 196);
        doc.setLineWidth(0.5);
        doc.line(20, 32, doc.internal.pageSize.getWidth() - 20, 32);
        
        // Add date
        const currentDate = new Date();
        doc.setFontSize(10);
        doc.setTextColor(120, 120, 120);
        doc.text(`Report generated: ${currentDate.toLocaleDateString()} ${currentDate.toLocaleTimeString()}`, 
                    doc.internal.pageSize.getWidth() - 20, 38, { align: 'right' });
        
        // Get account data
        let idpsAccounts = accountDetails.idps.filter(a => a.balance > 0);
        let superAccounts = accountDetails.super.filter(a => a.balance > 0);
        const totalBalance = [...idpsAccounts, ...superAccounts].reduce((sum, account) => sum + account.balance, 0);
        
        // Add total balance
        doc.setFillColor(245, 245, 245);
        doc.roundedRect(20, 45, doc.internal.pageSize.getWidth() - 40, 20, 3, 3, 'F');
        
        doc.setFontSize(12);
        doc.setTextColor(40, 40, 40);
        doc.text('Total Account Balance', doc.internal.pageSize.getWidth() / 2, 53, { align: 'center' });
        
        doc.setFontSize(16);
        doc.setTextColor(68, 114, 196);
        doc.text(formatCurrency(totalBalance), doc.internal.pageSize.getWidth() / 2, 60, { align: 'center' });
        
        let yPosition = 75;
        
        // Client preference if set
        const preferenceValue = document.getElementById('platform-preference').value;
        if (preferenceValue !== 'standard') {
            let preferenceText = '';
            if (preferenceValue === 'no-online') {
                preferenceText = 'The client has expressed a desire to use a simple platform without online complexity.';
            } else if (preferenceValue === 'custom') {
                const customText = document.getElementById('custom-preference-text').value;
                preferenceText = customText || 'Custom preference (no details provided).';
            }
            
            // Calculate required height for the preference box
            const maxWidth = doc.internal.pageSize.getWidth() - 50;
            doc.setFontSize(10);
            const splitText = doc.splitTextToSize(preferenceText, maxWidth);
            const requiredHeight = 15 + (splitText.length * 5);
            
            // Check if we need a new page
            if (yPosition + requiredHeight > 270) {
                doc.addPage();
                yPosition = 20;
            }
            
            // Draw background box
            doc.setFillColor(248, 249, 250);
            doc.roundedRect(20, yPosition, doc.internal.pageSize.getWidth() - 40, requiredHeight, 3, 3, 'F');
            
            // Add title
            doc.setFontSize(12);
            doc.setTextColor(40, 40, 40);
            doc.text('Client Platform Preference:', 25, yPosition + 8);
            
            // Add preference text
            doc.setFontSize(10);
            doc.setTextColor(60, 60, 60);
            
            let textY = yPosition + 15;
            splitText.forEach((line, index) => {
                // Check if we need a new page mid-text
                if (textY > 270) {
                    doc.addPage();
                    yPosition = 20;
                    textY = 25;
                    
                    // Continue with remaining text
                    doc.setFillColor(248, 249, 250);
                    const remainingHeight = (splitText.length - index) * 5 + 10;
                    doc.roundedRect(20, yPosition, doc.internal.pageSize.getWidth() - 40, remainingHeight, 3, 3, 'F');
                    doc.setFontSize(10);
                    doc.setTextColor(60, 60, 60);
                }
                
                // Clean the text to remove any special characters
                const cleanLine = line.replace(/[^\x20-\x7E]/g, '');
                doc.text(cleanLine, 25, textY);
                textY += 5;
            });
            
            yPosition = textY + 10;
        }
        
        // Add account tables if we have accounts
        if (idpsAccounts.length > 0 || superAccounts.length > 0) {
            doc.setFontSize(14);
            doc.setTextColor(40, 40, 40);
            doc.text('Account Details', 20, yPosition);
            yPosition += 8;
            
            // Add IDPS accounts
            if (idpsAccounts.length > 0) {
                doc.setFontSize(12);
                doc.text('IDPS Accounts', 20, yPosition);
                yPosition += 6;
                
                // Create table data
                const idpsTableData = [];
                let idpsTotalBalance = 0;
                
                idpsAccounts.forEach((account, index) => {
                    idpsTotalBalance += account.balance;
                    idpsTableData.push([`IDPS Account ${index + 1}`, formatCurrency(account.balance)]);
                });
                
                if (idpsAccounts.length > 1) {
                    idpsTableData.push(['Total IDPS', formatCurrency(idpsTotalBalance)]);
                }
                
                // Generate table
                doc.autoTable({
                    startY: yPosition,
                    head: [['Account', 'Balance']],
                    body: idpsTableData,
                    theme: 'grid',
                    headStyles: {
                        fillColor: [68, 114, 196],
                        textColor: [255, 255, 255],
                        fontStyle: 'bold'
                    },
                    styles: {
                        fontSize: 10,
                        cellPadding: 3
                    },
                    columnStyles: {
                        0: { halign: 'left' },
                        1: { halign: 'right' }
                    },
                    footStyles: {
                        fillColor: [233, 236, 239],
                        fontStyle: 'bold'
                    }
                });
                
                yPosition = doc.lastAutoTable.finalY + 10;
            }
            
            // Add Super accounts
            if (superAccounts.length > 0) {
                doc.setFontSize(12);
                doc.text('Super/Pension Accounts', 20, yPosition);
                yPosition += 6;
                
                // Create table data
                const superTableData = [];
                let superTotalBalance = 0;
                
                superAccounts.forEach((account, index) => {
                    superTotalBalance += account.balance;
                    superTableData.push([`Super/Pension Account ${index + 1}`, formatCurrency(account.balance)]);
                });
                
                if (superAccounts.length > 1) {
                    superTableData.push(['Total Super/Pension', formatCurrency(superTotalBalance)]);
                }
                
                // Generate table
                doc.autoTable({
                    startY: yPosition,
                    head: [['Account', 'Balance']],
                    body: superTableData,
                    theme: 'grid',
                    headStyles: {
                        fillColor: [68, 114, 196],
                        textColor: [255, 255, 255],
                        fontStyle: 'bold'
                    },
                    styles: {
                        fontSize: 10,
                        cellPadding: 3
                    },
                    columnStyles: {
                        0: { halign: 'left' },
                        1: { halign: 'right' }
                    },
                    footStyles: {
                        fillColor: [233, 236, 239],
                        fontStyle: 'bold'
                    }
                });
                
                yPosition = doc.lastAutoTable.finalY + 10;
            }
        }
        
        // Check if we need a new page for the fee comparison table
        if (yPosition > 180) {
            doc.addPage();
            yPosition = 20;
        }
        
        // Add fee comparison section
        doc.setFontSize(14);
        doc.setTextColor(40, 40, 40);
        doc.text('Fee Comparison Results', 20, yPosition);
        yPosition += 8;
        
        // Get fee data from the table
        const feeTableData = [];
        const originalTable = document.getElementById('fee-comparison-table');
        const originalRows = originalTable.querySelectorAll('tr');
        
        // Track which rows are current platforms
        const currentPlatformRows = [];
        
        // Extract data from merged view
        originalRows.forEach((origRow, rowIndex) => {
            if (origRow.classList.contains('fee-details-row')) return;
            
            const cells = origRow.querySelectorAll('td');
            if (cells.length === 0) return;
            
            const platformNameEl = cells[0].querySelector('.platform-name');
            if (!platformNameEl) return;
            
            const rowData = [];
            rowData.push(platformNameEl.textContent.trim());
            cells.forEach((cell, idx) => {
                if (idx > 0) rowData.push(cell.textContent.trim());
            });
            
            feeTableData.push(rowData);
            
            if (origRow.classList.contains('current-platform')) {
                currentPlatformRows.push(feeTableData.length - 1);
            }
        });
        
        // Generate fee comparison table
        doc.autoTable({
            startY: yPosition,
            head: [['Platform', 'Admin Fee ($)', 'Expense Recovery ($)', 'Total Fee ($)']],
            body: feeTableData,
            theme: 'grid',
            headStyles: {
                fillColor: [68, 114, 196],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 11
            },
            styles: {
                fontSize: 10,
                cellPadding: 3
            },
            columnStyles: {
                0: { halign: 'left', cellWidth: 'auto' },
                1: { halign: 'right', cellWidth: 40 },
                2: { halign: 'right', cellWidth: 40 },
                3: { halign: 'right', cellWidth: 40 }
            },
            // Highlight current platform rows
            didParseCell: function(data) {
                if (currentPlatformRows.includes(data.row.index)) {
                    data.cell.styles.fillColor = [226, 240, 217]; // Light green
                    data.cell.styles.fontStyle = 'bold';
                    
                    if (data.column.index === 0) {
                        data.cell.styles.lineWidth = { left: 0.5 };
                        data.cell.styles.lineColor = { left: [112, 173, 71] }; // Green
                    }
                }
            },
            // Ensure platform names are visible
            showHead: 'everyPage',
            margin: { top: 10 }
        });
        
        yPosition = doc.lastAutoTable.finalY + 10;
        
        // Add notes section
        if (yPosition > 220) {
            doc.addPage();
            yPosition = 20;
        }
        
        doc.setFontSize(12);
        doc.setTextColor(40, 40, 40);
        doc.text('Notes:', 20, yPosition);
        yPosition += 6;
        
        // Get notes from the page
        const originalNotes = document.querySelectorAll('.note p');
        const noteLines = [];
        
        originalNotes.forEach(note => {
            noteLines.push('• ' + note.textContent.trim());
        });
        
        // Add notes
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        
        noteLines.forEach((line, lineIndex) => {
            // Clean the text to remove any special characters
            const cleanLine = line.replace(/[^\x20-\x7E]/g, '');
            
            // Check if we need to wrap text
            const textWidth = doc.getStringUnitWidth(cleanLine) * 9 / doc.internal.scaleFactor;
            const maxWidth = doc.internal.pageSize.getWidth() - 40;
            
            if (textWidth > maxWidth) {
                const splitLines = doc.splitTextToSize(cleanLine, maxWidth);
                splitLines.forEach(splitLine => {
                    // Check if we need a new page
                    if (yPosition > 275) {
                        doc.addPage();
                        yPosition = 20;
                        
                        // Re-add section header if continuing notes
                        if (lineIndex > 0) {
                            doc.setFontSize(12);
                            doc.setTextColor(40, 40, 40);
                            doc.text('Notes (continued):', 20, yPosition);
                            yPosition += 8;
                            doc.setFontSize(9);
                            doc.setTextColor(100, 100, 100);
                        }
                    }
                    
                    doc.text(splitLine, 20, yPosition);
                    yPosition += 5;
                });
            } else {
                // Check if we need a new page
                if (yPosition > 275) {
                    doc.addPage();
                    yPosition = 20;
                    
                    // Re-add section header if continuing notes
                    if (lineIndex > 0) {
                        doc.setFontSize(12);
                        doc.setTextColor(40, 40, 40);
                        doc.text('Notes (continued):', 20, yPosition);
                        yPosition += 8;
                        doc.setFontSize(9);
                        doc.setTextColor(100, 100, 100);
                    }
                }
                
                doc.text(cleanLine, 20, yPosition);
                yPosition += 5;
            }
            
            // Add a bit of spacing between notes
            yPosition += 1;
        });
        
        // Add disclaimer at the bottom of the last page
        const disclaimer = 'This comparison is for informational purposes only and should not be considered as financial advice.';
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(disclaimer, doc.internal.pageSize.getWidth() / 2, 285, { align: 'center' });
        
        // Save the PDF
        doc.save('Platform_Fee_Comparison.pdf');
        
        // Restore button state
        downloadPdfBtn.innerHTML = originalText;
        downloadPdfBtn.disabled = false;
    } catch (error) {
        console.error("Error in downloadPDF:", error);
        
        // Restore button state on error
        const downloadPdfBtn = document.getElementById('download-pdf');
        if (downloadPdfBtn) {
            downloadPdfBtn.innerHTML = 'Download as PDF';
            downloadPdfBtn.disabled = false;
        }
        
        // Show error to user
        alert('An error occurred while generating the PDF. Please try again.');
    }
}

// Calculate fees for a specific platform
function calculatePlatformFees(platform, allAccounts) {
    let totalAdminFee = 0;
    let totalExpenseFee = 0;
    let accountFees = [];
    
    // Calculate fees for IDPS accounts
    allAccounts.idps.forEach((account, index) => {
        if (account.balance > 0) {
            let platformToUse = platform;
            
            // Use the appropriate platform for the account type
            if (platform === "CFS Edge Super" && account.balance > 0) {
                platformToUse = "CFS Edge Investment";
            } else if (platform === "CFS Edge") {
                // For CFS Edge, use CFS Edge Investment for IDPS accounts
                platformToUse = "CFS Edge Investment";
            } else if (platform === "Centric One") {
                // Centric One is only for Super accounts
                return;
            }
            
            if (productFees[platformToUse]) {
                const adminFee = productFees[platformToUse].adminFee(
                    0, // Total balance (not used in most calculations now)
                    account.balance,
                    'idps',
                    allAccounts
                );
                
                const expenseFee = productFees[platformToUse].expenseFee(
                    account.balance,
                    'idps'
                );
                
                totalAdminFee += adminFee;
                totalExpenseFee += expenseFee;
                
                accountFees.push({
                    type: 'idps',
                    index: index,
                    name: `IDPS Account ${index + 1}`,
                    balance: account.balance,
                    adminFee: adminFee,
                    expenseFee: expenseFee,
                    totalFee: adminFee + expenseFee,
                    platform: platformToUse
                });
            }
        }
    });
    
    // Calculate fees for Super accounts
    allAccounts.super.forEach((account, index) => {
        if (account.balance > 0) {
            let platformToUse = platform;
            
            // Use the appropriate platform for the account type
            if (platform === "CFS Edge Investment" && account.balance > 0) {
                platformToUse = "CFS Edge Super";
            } else if (platform === "CFS Edge" && account.balance > 0) {
                platformToUse = "CFS Edge Super";
            } else if (platform === "Centric") {
                platformToUse = "Centric Choice";
            }
            
            if (productFees[platformToUse]) {
                const adminFee = productFees[platformToUse].adminFee(
                    0, // Total balance (not used in most calculations now)
                    account.balance,
                    'super',
                    allAccounts
                );
                
                const expenseFee = productFees[platformToUse].expenseFee(
                    account.balance,
                    'super'
                );
                
                totalAdminFee += adminFee;
                totalExpenseFee += expenseFee;
                
                accountFees.push({
                    type: 'super',
                    index: index,
                    name: `Super/Pension Account ${index + 1}`,
                    balance: account.balance,
                    adminFee: adminFee,
                    expenseFee: expenseFee,
                    totalFee: adminFee + expenseFee,
                    platform: platformToUse
                });
            }
        }
    });
    
    return {
        adminFee: totalAdminFee,
        expenseFee: totalExpenseFee,
        totalFee: totalAdminFee + totalExpenseFee,
        accountFees: accountFees
    };
}

// Main calculation function
function calculate() {
    try {
        // Get total balances
        let totalIdpsBalance = 0;
        let totalSuperBalance = 0;
        
        // Process IDPS accounts
        if (accountDetails && accountDetails.idps) {
            accountDetails.idps.forEach(account => {
                totalIdpsBalance += account.balance;
            });
        }
        
        // Process Super accounts
        if (accountDetails && accountDetails.super) {
            accountDetails.super.forEach(account => {
                totalSuperBalance += account.balance;
            });
        }
        
        const totalBalance = totalIdpsBalance + totalSuperBalance;
        
        // Update total balance display
        const totalBalanceElement = document.getElementById('total-balance-amount');
        if (totalBalanceElement) {
            totalBalanceElement.textContent = formatCurrency(totalBalance);
        }
        
        // Update the header text based on number of accounts
        const totalAccountsHeader = document.querySelector('.total-balance-display h3');
        if (totalAccountsHeader) {
            const accountCount = (accountDetails.idps ? accountDetails.idps.length : 0) + 
                                 (accountDetails.super ? accountDetails.super.length : 0);
            const activeAccountCount = (accountDetails.idps ? accountDetails.idps.filter(a => a.balance > 0).length : 0) + 
                                      (accountDetails.super ? accountDetails.super.filter(a => a.balance > 0).length : 0);
            
            if (activeAccountCount > 1) {
                totalAccountsHeader.textContent = "Total Account Balances";
            } else {
                totalAccountsHeader.textContent = "Total Account Balance";
            }
        }
        
        // Clear fee comparison table
        const feeComparisonTable = document.getElementById('fee-comparison-table');
        if (!feeComparisonTable) {
            console.error("Fee comparison table not found");
            return;
        }
        
        feeComparisonTable.innerHTML = '';
        
        // Skip if no accounts or balances
        if (totalBalance === 0) {
            feeComparisonTable.innerHTML = '<tr><td colspan="4">Please add account details to see fee comparisons.</td></tr>';
            return;
        }
        
        // Define available platforms
        let platformsData = [];
        
        // Add platforms based on account types
        let availablePlatforms = [];
        
        // Check if there are IDPS accounts
        const hasIdps = totalIdpsBalance > 0;
        
        // Check if there are Super accounts
        const hasSuper = totalSuperBalance > 0;
        
        if (hasIdps && !hasSuper) {
            // IDPS only
            availablePlatforms = [
                "Centric",
                "BT Panorama (Compact Menu)",
                "BT Panorama (Full Menu)",
                "Portfolio Solutions",
                "CFS Edge"
            ];
        } else if (!hasIdps && hasSuper) {
            // Super only
            availablePlatforms = [
                "Centric Choice",
                "Centric One",
                "BT Panorama (Compact Menu)",
                "BT Panorama (Full Menu)",
                "Portfolio Solutions",
                "CFS Edge"
            ];
        } else if (hasIdps && hasSuper) {
            // Both IDPS and Super
            availablePlatforms = [
                "Centric", // Will use Centric Choice for Super accounts
                "BT Panorama (Compact Menu)",
                "BT Panorama (Full Menu)",
                "Portfolio Solutions",
                "CFS Edge" // Will use CFS Edge Investment for IDPS and CFS Edge Super for Super accounts
            ];
        }
        
        // Ensure currentPlatforms is initialized
        if (!currentPlatforms) {
            currentPlatforms = {};
        }
        
        // Calculate fees for each platform
        availablePlatforms.forEach(platform => {
            const fees = calculatePlatformFees(platform, accountDetails);
            
            platformsData.push({
                name: platform,
                adminFee: fees.adminFee,
                expenseFee: fees.expenseFee,
                totalFee: fees.totalFee,
                isCurrent: currentPlatforms[platform] || false,
                accountFees: fees.accountFees
            });
        });
        
        // Update checkboxes if the selector is visible
        if (document.getElementById('set-current-platform') && 
            document.getElementById('set-current-platform').value === 'yes') {
            populatePlatformCheckboxes();
        }
        
        // Separate current platforms and other platforms
        const currentPlatformsData = platformsData.filter(p => p.isCurrent);
        const otherPlatformsData = platformsData.filter(p => !p.isCurrent);
        
        // Sort other platforms by total fee (cheapest first)
        otherPlatformsData.sort((a, b) => a.totalFee - b.totalFee);
        
        // Combine them with current platforms at the top
        platformsData = [...currentPlatformsData, ...otherPlatformsData];
        
        // Add rows to table - merged view only
        platformsData.forEach(platform => {
            const platformId = platform.name.replace(/\s+/g, '-').replace(/\(/g, '').replace(/\)/g, '');
            const row = document.createElement('tr');
            row.className = platform.isCurrent ? 'current-platform' : '';
            
            row.innerHTML = `
                <td>
                    <span class="expand-icon" id="expand-${platformId}" onclick="toggleFeeDetails('${platformId}')" style="cursor: pointer; margin-right: 8px;">▶</span>
                    <span class="platform-name">${platform.name}${platform.isCurrent ? ' (Selected)' : ''}</span>
                </td>
                <td>${formatCurrency(platform.adminFee)}</td>
                <td>${formatCurrency(platform.expenseFee)}</td>
                <td>${formatCurrency(platform.totalFee)}</td>
            `;
            
            feeComparisonTable.appendChild(row);
            
            // Add expandable details row
            const detailsRow = document.createElement('tr');
            detailsRow.id = `details-${platformId}`;
            detailsRow.className = 'fee-details-row hidden';
            detailsRow.innerHTML = `
                <td colspan="4">
                    <div class="fee-breakdown-container">
                        <h4>Fee Calculation Breakdown</h4>
                        <div id="breakdown-${platformId}"></div>
                    </div>
                </td>
            `;
            feeComparisonTable.appendChild(detailsRow);
            
            // Populate breakdown details
            const breakdownContainer = document.getElementById(`breakdown-${platformId}`);
            if (breakdownContainer && platform.accountFees.length > 0) {
                platform.accountFees.forEach(accountFee => {
                    const accountBreakdown = document.createElement('div');
                    accountBreakdown.className = 'account-breakdown';
                    accountBreakdown.innerHTML = `<h5>${accountFee.name} (${formatCurrency(accountFee.balance)})</h5>`;
                    
                    // Get detailed breakdown
                    const breakdown = calculateDetailedFeeBreakdown(
                        platform.name,
                        accountFee.balance,
                        accountFee.type,
                        accountDetails
                    );
                    
                    // Admin fee breakdown
                    if (breakdown.adminFeeComponents.length > 0) {
                        const adminSection = document.createElement('div');
                        adminSection.className = 'fee-section';
                        adminSection.innerHTML = '<h6>Admin Fee:</h6>';
                        
                        breakdown.adminFeeComponents.forEach(component => {
                            const componentDiv = document.createElement('div');
                            componentDiv.className = 'fee-component';
                            componentDiv.innerHTML = `
                                <span class="component-description">${component.description}</span>
                                <span class="component-amount">${formatCurrency(component.amount)}</span>
                            `;
                            adminSection.appendChild(componentDiv);
                        });
                        
                        accountBreakdown.appendChild(adminSection);
                    }
                    
                    // Expense fee breakdown
                    if (breakdown.expenseFeeComponents.length > 0) {
                        const expenseSection = document.createElement('div');
                        expenseSection.className = 'fee-section';
                        expenseSection.innerHTML = '<h6>Expense Recovery Fee:</h6>';
                        
                        breakdown.expenseFeeComponents.forEach(component => {
                            const componentDiv = document.createElement('div');
                            componentDiv.className = 'fee-component';
                            componentDiv.innerHTML = `
                                <span class="component-description">${component.description}</span>
                                <span class="component-amount">${formatCurrency(component.amount)}</span>
                            `;
                            expenseSection.appendChild(componentDiv);
                        });
                        
                        accountBreakdown.appendChild(expenseSection);
                    }
                    
                    // Total for this account
                    const totalDiv = document.createElement('div');
                    totalDiv.className = 'account-total';
                    totalDiv.innerHTML = `
                        <span>Account Total:</span>
                        <span>${formatCurrency(accountFee.totalFee)}</span>
                    `;
                    accountBreakdown.appendChild(totalDiv);
                    
                    breakdownContainer.appendChild(accountBreakdown);
                });
            }
        });
        
        // Update IDPS and Super totals if needed
        const idpsTotalBalanceCell = document.getElementById('idps-total-balance');
        if (idpsTotalBalanceCell) {
            idpsTotalBalanceCell.textContent = formatCurrency(totalIdpsBalance);
        }
        
        const superTotalBalanceCell = document.getElementById('super-total-balance');
        if (superTotalBalanceCell) {
            superTotalBalanceCell.textContent = formatCurrency(totalSuperBalance);
        }
    } catch (error) {
        console.error("Error in calculate function:", error);
    }
}

// Initialize the form when the page loads
document.addEventListener('DOMContentLoaded', function() {
    try {
        // Set up event listeners
        document.getElementById('update-accounts-btn').addEventListener('click', updateAccountsVisibility);
        document.getElementById('set-current-platform').addEventListener('change', toggleCurrentPlatformSelector);
        document.getElementById('platform-preference').addEventListener('change', toggleCustomText);
        document.getElementById('save-current-platforms').addEventListener('click', saveCurrentPlatforms);
        
        // Update download listeners
        document.getElementById('download-csv').addEventListener('click', downloadComparison);
        document.getElementById('download-pdf').addEventListener('click', downloadPDF);
        
        // Initialize the UI
        toggleCustomText();
    } catch (error) {
        console.error("Error in initialization:", error);
    }
});
