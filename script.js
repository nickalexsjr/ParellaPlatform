// Global variables
let currentPlatforms = {};
let accountDetails = {
    idps: [],
    super: []
};

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
    "Centric IDPS": {
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
        title.textContent = 'Current Platform(s) Saved';
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
            const cells = row.querySelectorAll('td');
            if (cells.length > 0) {
                const rowData = [
                    cells[0].textContent.trim(),
                    cells[1].textContent.trim().replace('$', '').replace(',', ''),
                    cells[2].textContent.trim().replace('$', '').replace(',', ''),
                    cells[3].textContent.trim().replace('$', '').replace(',', '')
                ];
                csvContent += rowData.join(',') + '\n';
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

// Download comparison as PDF - Full Page Version
function downloadPDF() {
    try {
        // Show loading indication on the button
        const downloadPdfBtn = document.getElementById('download-pdf');
        const originalText = downloadPdfBtn.innerHTML;
        downloadPdfBtn.innerHTML = 'Generating PDF...';
        downloadPdfBtn.disabled = true;
        
        // Create a container for the content to be included in the PDF
        const container = document.createElement('div');
        container.style.padding = '20px';
        container.style.backgroundColor = 'white';
        container.style.color = 'black';
        container.style.fontFamily = 'Arial, sans-serif';
        
        // Add a title
        const title = document.createElement('h1');
        title.textContent = 'Platform Fee Comparison Report';
        title.style.textAlign = 'center';
        title.style.marginBottom = '20px';
        title.style.color = '#333';
        title.style.borderBottom = '2px solid #4472C4';
        title.style.paddingBottom = '10px';
        container.appendChild(title);
        
        // Add account information section
        const accountSection = document.createElement('div');
        accountSection.style.marginBottom = '30px';
        
        // Get account details
        let idpsAccounts = accountDetails.idps.filter(a => a.balance > 0);
        let superAccounts = accountDetails.super.filter(a => a.balance > 0);
        
        if (idpsAccounts.length > 0 || superAccounts.length > 0) {
            const accountHeader = document.createElement('h2');
            accountHeader.textContent = 'Account Details';
            accountHeader.style.color = '#4472C4';
            accountHeader.style.marginBottom = '15px';
            accountSection.appendChild(accountHeader);
            
            // Create accounts table
            if (idpsAccounts.length > 0) {
                const idpsHeader = document.createElement('h3');
                idpsHeader.textContent = 'IDPS Accounts';
                idpsHeader.style.color = '#333';
                idpsHeader.style.marginTop = '15px';
                idpsHeader.style.marginBottom = '10px';
                accountSection.appendChild(idpsHeader);
                
                const idpsTable = document.createElement('table');
                idpsTable.style.width = '100%';
                idpsTable.style.borderCollapse = 'collapse';
                idpsTable.style.marginBottom = '20px';
                
                // Add table headers
                const idpsHeaderRow = document.createElement('tr');
                idpsHeaderRow.innerHTML = `
                    <th style="background-color: #4472C4; color: white; padding: 8px; text-align: left; border: 1px solid #ddd;">Account</th>
                    <th style="background-color: #4472C4; color: white; padding: 8px; text-align: right; border: 1px solid #ddd;">Balance</th>
                `;
                idpsTable.appendChild(idpsHeaderRow);
                
                // Add account rows
                idpsAccounts.forEach((account, index) => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td style="padding: 8px; text-align: left; border: 1px solid #ddd; background-color: ${index % 2 === 0 ? '#f9f9f9' : 'white'};">IDPS Account ${index + 1}</td>
                        <td style="padding: 8px; text-align: right; border: 1px solid #ddd; background-color: ${index % 2 === 0 ? '#f9f9f9' : 'white'};">${formatCurrency(account.balance)}</td>
                    `;
                    idpsTable.appendChild(row);
                });
                
                // Add total row if multiple accounts
                if (idpsAccounts.length > 1) {
                    const totalIdpsBalance = idpsAccounts.reduce((sum, account) => sum + account.balance, 0);
                    const totalRow = document.createElement('tr');
                    totalRow.innerHTML = `
                        <td style="padding: 8px; text-align: left; border: 1px solid #ddd; background-color: #e6e6e6; font-weight: bold;">Total IDPS</td>
                        <td style="padding: 8px; text-align: right; border: 1px solid #ddd; background-color: #e6e6e6; font-weight: bold;">${formatCurrency(totalIdpsBalance)}</td>
                    `;
                    idpsTable.appendChild(totalRow);
                }
                
                accountSection.appendChild(idpsTable);
            }
            
            if (superAccounts.length > 0) {
                const superHeader = document.createElement('h3');
                superHeader.textContent = 'Super/Pension Accounts';
                superHeader.style.color = '#333';
                superHeader.style.marginTop = '15px';
                superHeader.style.marginBottom = '10px';
                accountSection.appendChild(superHeader);
                
                const superTable = document.createElement('table');
                superTable.style.width = '100%';
                superTable.style.borderCollapse = 'collapse';
                superTable.style.marginBottom = '20px';
                
                // Add table headers
                const superHeaderRow = document.createElement('tr');
                superHeaderRow.innerHTML = `
                    <th style="background-color: #4472C4; color: white; padding: 8px; text-align: left; border: 1px solid #ddd;">Account</th>
                    <th style="background-color: #4472C4; color: white; padding: 8px; text-align: right; border: 1px solid #ddd;">Balance</th>
                `;
                superTable.appendChild(superHeaderRow);
                
                // Add account rows
                superAccounts.forEach((account, index) => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td style="padding: 8px; text-align: left; border: 1px solid #ddd; background-color: ${index % 2 === 0 ? '#f9f9f9' : 'white'};">Super/Pension Account ${index + 1}</td>
                        <td style="padding: 8px; text-align: right; border: 1px solid #ddd; background-color: ${index % 2 === 0 ? '#f9f9f9' : 'white'};">${formatCurrency(account.balance)}</td>
                    `;
                    superTable.appendChild(row);
                });
                
                // Add total row if multiple accounts
                if (superAccounts.length > 1) {
                    const totalSuperBalance = superAccounts.reduce((sum, account) => sum + account.balance, 0);
                    const totalRow = document.createElement('tr');
                    totalRow.innerHTML = `
                        <td style="padding: 8px; text-align: left; border: 1px solid #ddd; background-color: #e6e6e6; font-weight: bold;">Total Super/Pension</td>
                        <td style="padding: 8px; text-align: right; border: 1px solid #ddd; background-color: #e6e6e6; font-weight: bold;">${formatCurrency(totalSuperBalance)}</td>
                    `;
                    superTable.appendChild(totalRow);
                }
                
                accountSection.appendChild(superTable);
            }
        }
        
        container.appendChild(accountSection);
        
        // Add total balance info
        const totalBalanceInfo = document.createElement('div');
        totalBalanceInfo.style.marginBottom = '25px';
        totalBalanceInfo.style.padding = '15px';
        totalBalanceInfo.style.backgroundColor = '#f5f5f5';
        totalBalanceInfo.style.borderRadius = '5px';
        totalBalanceInfo.style.border = '1px solid #ddd';
        
        const totalBalanceHeader = document.createElement('h2');
        totalBalanceHeader.textContent = document.querySelector('.total-balance-display h3').textContent;
        totalBalanceHeader.style.margin = '0 0 10px 0';
        totalBalanceHeader.style.color = '#333';
        
        const totalBalanceAmount = document.createElement('div');
        totalBalanceAmount.textContent = document.getElementById('total-balance-amount').textContent;
        totalBalanceAmount.style.fontSize = '24px';
        totalBalanceAmount.style.fontWeight = 'bold';
        totalBalanceAmount.style.color = '#0066cc';
        
        totalBalanceInfo.appendChild(totalBalanceHeader);
        totalBalanceInfo.appendChild(totalBalanceAmount);
        container.appendChild(totalBalanceInfo);
        
        // Add client preference info if set
        const preferenceValue = document.getElementById('platform-preference').value;
        if (preferenceValue !== 'standard') {
            const preferenceSection = document.createElement('div');
            preferenceSection.style.marginBottom = '25px';
            preferenceSection.style.padding = '15px';
            preferenceSection.style.backgroundColor = '#f9f9f9';
            preferenceSection.style.borderRadius = '5px';
            preferenceSection.style.border = '1px solid #ddd';
            
            const preferenceHeader = document.createElement('h3');
            preferenceHeader.textContent = 'Client Platform Preference';
            preferenceHeader.style.margin = '0 0 10px 0';
            preferenceHeader.style.color = '#333';
            preferenceSection.appendChild(preferenceHeader);
            
            const preferenceText = document.createElement('p');
            if (preferenceValue === 'no-online') {
                preferenceText.textContent = 'The client has expressed a desire to use a simple platform without online complexity.';
            } else if (preferenceValue === 'custom') {
                const customText = document.getElementById('custom-preference-text').value;
                preferenceText.textContent = customText || 'Custom preference (no details provided).';
            }
            preferenceText.style.margin = '0';
            preferenceSection.appendChild(preferenceText);
            
            container.appendChild(preferenceSection);
        }
        
        // Add comparison results header
        const resultsHeader = document.createElement('h2');
        resultsHeader.textContent = 'Fee Comparison Results';
        resultsHeader.style.color = '#4472C4';
        resultsHeader.style.marginTop = '30px';
        resultsHeader.style.marginBottom = '15px';
        container.appendChild(resultsHeader);
        
        // Clone the fee comparison table for the PDF
        const feeTable = document.querySelector('.fee-table').cloneNode(true);
        
        // Style the table for PDF
        feeTable.style.width = '100%';
        feeTable.style.borderCollapse = 'collapse';
        feeTable.style.marginBottom = '30px';
        
        const ths = feeTable.querySelectorAll('th');
        const tds = feeTable.querySelectorAll('td');
        
        ths.forEach(th => {
            th.style.backgroundColor = '#4472C4';
            th.style.color = 'white';
            th.style.padding = '10px';
            th.style.textAlign = th.cellIndex === 0 ? 'left' : 'right';
            th.style.border = '1px solid #ddd';
            th.style.fontSize = '14px';
        });
        
        // Get all rows
        const rows = feeTable.querySelectorAll('tr');
        rows.forEach((row, index) => {
            if (index > 0) { // Skip header row
                // Set alternating row colors
                if (!row.classList.contains('current-platform')) {
                    row.style.backgroundColor = index % 2 === 0 ? '#f9f9f9' : 'white';
                }
                
                // Style all cells in this row
                const cells = row.querySelectorAll('td');
                cells.forEach(td => {
                    td.style.padding = '10px';
                    td.style.textAlign = td.cellIndex === 0 ? 'left' : 'right';
                    td.style.border = '1px solid #ddd';
                    td.style.fontSize = '14px';
                    
                    // If this is a current platform row, apply special styling
                    if (row.classList.contains('current-platform')) {
                        td.style.backgroundColor = '#E2EFDA';
                        td.style.fontWeight = 'bold';
                    } else {
                        td.style.backgroundColor = index % 2 === 0 ? '#f9f9f9' : 'white';
                    }
                });
            }
        });
        
        container.appendChild(feeTable);
        
        // Add explanatory notes
        const notesHeader = document.createElement('h3');
        notesHeader.textContent = 'Notes';
        notesHeader.style.color = '#4472C4';
        notesHeader.style.marginTop = '25px';
        notesHeader.style.marginBottom = '10px';
        container.appendChild(notesHeader);
        
        // Clone and format all notes
        const notesList = document.createElement('ul');
        notesList.style.color = '#666';
        notesList.style.fontSize = '12px';
        notesList.style.paddingLeft = '20px';
        
        const originalNotes = document.querySelectorAll('.note p');
        originalNotes.forEach(note => {
            const listItem = document.createElement('li');
            listItem.textContent = note.textContent;
            listItem.style.marginBottom = '5px';
            notesList.appendChild(listItem);
        });
        
        container.appendChild(notesList);
        
        // Add report footer with date and disclaimer
        const footer = document.createElement('div');
        footer.style.marginTop = '30px';
        footer.style.borderTop = '1px solid #ddd';
        footer.style.paddingTop = '15px';
        footer.style.display = 'flex';
        footer.style.justifyContent = 'space-between';
        footer.style.fontSize = '11px';
        footer.style.color = '#666';
        
        const dateInfo = document.createElement('div');
        const currentDate = new Date();
        dateInfo.textContent = `Report generated on: ${currentDate.toLocaleDateString()} at ${currentDate.toLocaleTimeString()}`;
        
        const disclaimer = document.createElement('div');
        disclaimer.textContent = 'This comparison is for informational purposes only and should not be considered as financial advice.';
        
        footer.appendChild(dateInfo);
        footer.appendChild(disclaimer);
        container.appendChild(footer);
        
        // Define PDF options
        const options = {
            margin: 15,
            filename: 'Platform_Fee_Comparison.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, logging: false },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        };
        
        // Generate the PDF
        html2pdf()
            .from(container)
            .set(options)
            .save()
            .then(() => {
                // Restore button state
                downloadPdfBtn.innerHTML = originalText;
                downloadPdfBtn.disabled = false;
            })
            .catch(error => {
                console.error("Error generating PDF:", error);
                downloadPdfBtn.innerHTML = originalText;
                downloadPdfBtn.disabled = false;
                alert('An error occurred while generating the PDF. Please try again.');
            });
            
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
    
    // Calculate fees for IDPS accounts
    allAccounts.idps.forEach(account => {
        if (account.balance > 0) {
            let platformToUse = platform;
            
            // Use the appropriate platform for the account type
            if (platform === "CFS Edge Super" && account.balance > 0) {
                platformToUse = "CFS Edge Investment";
            } else if (platform === "CFS Edge Investment" && allAccounts.super.length > 0 && allAccounts.super.some(a => a.balance > 0)) {
                // Skip for now, we'll calculate CFS Edge Investment fees separately
                return;
            } else if (platform === "Centric One") {
                // Centric One is only for Super accounts
                return;
            }
            
            if (productFees[platformToUse]) {
                totalAdminFee += productFees[platformToUse].adminFee(
                    0, // Total balance (not used in most calculations now)
                    account.balance,
                    'idps',
                    allAccounts
                );
                
                totalExpenseFee += productFees[platformToUse].expenseFee(
                    account.balance,
                    'idps'
                );
            }
        }
    });
    
    // Calculate fees for Super accounts
    allAccounts.super.forEach(account => {
        if (account.balance > 0) {
            let platformToUse = platform;
            
            // Use the appropriate platform for the account type
            if (platform === "CFS Edge Investment" && account.balance > 0) {
                platformToUse = "CFS Edge Super";
            } else if (platform === "Centric IDPS") {
                platformToUse = "Centric Choice";
            }
            
            if (productFees[platformToUse]) {
                totalAdminFee += productFees[platformToUse].adminFee(
                    0, // Total balance (not used in most calculations now)
                    account.balance,
                    'super',
                    allAccounts
                );
                
                totalExpenseFee += productFees[platformToUse].expenseFee(
                    account.balance,
                    'super'
                );
            }
        }
    });
    
    return {
        adminFee: totalAdminFee,
        expenseFee: totalExpenseFee,
        totalFee: totalAdminFee + totalExpenseFee
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
                "Centric IDPS",
                "BT Panorama (Compact Menu)",
                "BT Panorama (Full Menu)",
                "Portfolio Solutions",
                "CFS Edge Investment"
            ];
        } else if (!hasIdps && hasSuper) {
            // Super only
            availablePlatforms = [
                "Centric Choice",
                "Centric One",
                "BT Panorama (Compact Menu)",
                "BT Panorama (Full Menu)",
                "Portfolio Solutions",
                "CFS Edge Super"
            ];
        } else if (hasIdps && hasSuper) {
            // Both IDPS and Super
            availablePlatforms = [
                "Centric IDPS", // Will use Centric Choice for Super accounts
                "BT Panorama (Compact Menu)",
                "BT Panorama (Full Menu)",
                "Portfolio Solutions",
                "CFS Edge Investment" // Will use CFS Edge Super for Super accounts
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
                isCurrent: currentPlatforms[platform] || false
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
        
        // Add rows to table
        platformsData.forEach(platform => {
            const row = document.createElement('tr');
            row.className = platform.isCurrent ? 'current-platform' : '';
            
            row.innerHTML = `
                <td>${platform.name}${platform.isCurrent ? ' (Current)' : ''}</td>
                <td>${formatCurrency(platform.adminFee)}</td>
                <td>${formatCurrency(platform.expenseFee)}</td>
                <td>${formatCurrency(platform.totalFee)}</td>
            `;
            
            feeComparisonTable.appendChild(row);
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
