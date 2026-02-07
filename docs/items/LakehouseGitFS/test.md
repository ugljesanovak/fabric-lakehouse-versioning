# Version Controlled Lakehouse - Recording Test Script

**Focused test scenarios for demonstrating Git-like version control with multi-branch support.**

> **Note:** This item is called **Version Controlled Lakehouse** in the Fabric UI (internal code name: `LakehouseGitFS`).

---

## Recording Setup

✅ **Before recording:**
1. Microsoft Fabric workspace with permissions
2. Lakehouse with test CSV files uploaded to `/Files/` folder
3. Version Controlled Lakehouse item created
4. Screen recording software ready

📦 **Required test files** (upload to Lakehouse `/Files/`):
- [customers.csv](customers.csv) - 10 customers with purchase history
- [products.csv](products.csv) - 10 products across 3 categories  
- [sales.csv](sales.csv) - 15 sales transactions

---

## Quick Reference: Commit Modes

### 🔄 Overwrite Mode (Default)
- ⬜ Leave **"Save as new file"** unchecked
- Query results update the pinned file in a new commit
- File path preserved across version history
- **Use for:** Iterative refinements, data corrections

### 🆕 Save As New File Mode
- ✅ Check **"Save as new file"** checkbox  
- Query results create new derived file
- Original source files unchanged
- **Use for:** Creating derived datasets, analyses

---

## Test Scenario 1: Basic Overwrite Workflow

**Demonstrates:** Repository creation, file loading, query execution, overwrite commits, commit graph visualization

### Steps

1. **Create Repository**
   - Navigate to **Repositories** tab
   - Click **Create Repository** → Name: `CustomerAnalytics`
   - Default `main` branch created automatically
   - Click **Save** in ribbon

2. **Load and Pin File**
   - Click **Add Files** button
   - Select `customers.csv` from Lakehouse
   - File automatically pinned and loaded into DuckDB

3. **Execute First Query**
   ```sql
   -- Query 1: Customer overview by country
   SELECT 
     country,
     COUNT(*) as customer_count,
     SUM(total_purchases) as total_purchases
   FROM customers
   GROUP BY country
   ORDER BY total_purchases DESC;
   ```
   - Click **Run Query**
   - Review results (7 countries)

4. **Commit with Overwrite**
   - Click **Commit** in ribbon
   - ⬜ Leave "Save as new file" **UNCHECKED**
   - Message: `Initial customer analysis by country`
   - Click **Create Commit**
   - **Result:** First commit with 1 file (`customers.csv`)

5. **Execute Second Query on Same Pinned File**
   ```sql
   -- Query 2: High-value customer segments
   SELECT 
     customer_id,
     name,
     country,
     total_purchases,
     CASE 
       WHEN total_purchases >= 15 THEN 'Platinum'
       WHEN total_purchases >= 10 THEN 'Gold'
       ELSE 'Silver'
     END as tier
   FROM customers
   WHERE total_purchases >= 10
   ORDER BY total_purchases DESC;
   ```
   - Click **Run Query**
   - Review results (4 customers)

6. **Commit with Overwrite Again**
   - Click **Commit** in ribbon
   - ⬜ Leave "Save as new file" **UNCHECKED**
   - Message: `Add customer segmentation (Gold/Platinum)`
   - Click **Create Commit**
   - **Result:** Second commit, still with 1 file (`customers.csv` overwritten)

7. **View Commit Graph**
   - Switch to **Commit History** tab
   - **Observe:**
     - 2 commits displayed vertically
     - Visual line connects them (parent-child)
     - Latest commit (top) shows **HEAD** badge
     - Both commits show **1 file** in metadata
     - Same filename `customers.csv` but different content versions

### ✅ Validation Points
- [x] Each commit has different query results in `customers.csv`
- [x] File path remains consistent across commits
- [x] Commit graph shows linear parent chain
- [x] Physical storage: 2 separate folders in `/Files/.gitfs/{item_id}/Data/{commit_id}/`

---

## Test Scenario 2: Reset HEAD and Alternative History

**Demonstrates:** Commit reset (like `git reset`), creating alternative history, save as new file

### Steps

1. **Execute Query on Pinned File**
   - Ensure `customers.csv` is still pinned from previous scenario
   ```sql
   -- Query 3: Customer email domains
   SELECT 
     SUBSTRING(email, POSITION('@' IN email) + 1) as email_domain,
     COUNT(*) as customer_count
   FROM customers
   GROUP BY email_domain
   ORDER BY customer_count DESC;
   ```
   - Click **Run Query**

2. **Commit with Overwrite**
   - Click **Commit**
   - ⬜ Leave "Save as new file" **UNCHECKED**
   - Message: `Analyze email domains`
   - Click **Create Commit**
   - **Result:** 3rd commit on `main` branch

3. **Not Happy - Reset to Previous Commit**
   - Go to **Commit History** tab
   - Find 2nd commit: "Add customer segmentation"
   - Click commit card → Click **Reset to This Commit** action
   - **Result:** 
     - Branch `main` HEAD now points to 2nd commit
     - 3rd commit becomes orphaned (grayed out in graph)
     - Pinned file reverts to 2nd commit's version

4. **Execute Alternative Query**
   - With `customers.csv` still pinned (now at 2nd commit state):
   ```sql
   -- Query 3b: Geographic distribution percentages
   SELECT 
     country,
     COUNT(*) as customer_count,
     ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
   FROM customers
   GROUP BY country
   ORDER BY customer_count DESC;
   ```
   - Click **Run Query**

5. **Save as New File**
   - Click **Commit**
   - ✅ Check **"Save as new file"**
   - File name: `geographic_distribution.csv`
   - Message: `Create geographic distribution analysis`
   - Click **Create Commit**
   - **Result:** New 3rd commit (replaces orphaned one) with 2 files:
     - `customers.csv` (from parent commit)
     - `geographic_distribution.csv` (new derived file)

6. **View Commit Graph**
   - Switch to **Commit History** tab
   - **Observe:**
     - 3 commits total (orphaned email domain commit still visible but grayed)
     - Current branch path: Commit 1 → Commit 2 → New Commit 3 (geographic)
     - Alternative path (orphaned): Commit 1 → Commit 2 → Old Commit 3 (email domains)
     - New commit shows **2 files** in metadata

### ✅ Validation Points
- [x] Reset successfully moved HEAD back
- [x] Orphaned commit visible but marked as unreachable
- [x] New commit created alternative history from reset point
- [x] Save as new file added derived dataset alongside source

---

## Test Scenario 3: Branching with Same Filename

**Demonstrates:** Creating branch from non-HEAD commit, same filename with different content across branches

### Steps

1. **Create Branch from Earlier Commit**
   - In **Commit History** tab, find **1st commit**: "Initial customer analysis by country"
   - Click commit card → Click **Create Branch**
   - Branch name: `feature/country-analysis`
   - Click **Create**
   - **Result:** 
     - New branch created pointing to 1st commit
     - Automatically switched to `feature/country-analysis`
     - Repository shows only files from 1st commit

2. **Pin File on New Branch**
   - In Repository Explorer, verify `feature/country-analysis` is active
   - Pin `customers.csv` (contains 1st commit's data: country aggregates)

3. **Execute Query on Feature Branch**
   ```sql
   -- Query 4: Top countries by total purchases
   SELECT 
     country,
     total_purchases,
     ROUND(100.0 * total_purchases / SUM(total_purchases) OVER (), 2) as market_share_pct
   FROM (
     SELECT 
       country,
       SUM(total_purchases) as total_purchases
     FROM customers
     GROUP BY country
   )
   ORDER BY total_purchases DESC
   LIMIT 5;
   ```
   - Click **Run Query**

4. **Commit on Feature Branch**
   - Click **Commit**
   - ⬜ Leave "Save as new file" **UNCHECKED** (overwrite)
   - Message: `Focus on top 5 countries by market share`
   - Click **Create Commit**
   - **Result:** New commit on `feature/country-analysis` branch

5. **Switch to Main Branch**
   - Click **Branch Selector** dropdown in ribbon
   - Select `main`
   - **Result:** Branch switches, repository updates

6. **Compare Same Filename Across Branches**
   - On `main` branch: Pin `customers.csv`
   - **Observe:** Contains high-value customer segmentation (Gold/Platinum tiers)
   - Switch back to `feature/country-analysis` branch
   - **Observe:** Same filename `customers.csv` but contains top 5 countries with market share
   - **Show in Commit Graph:**
     - `main` branch path diverges from `feature/country-analysis`
     - Same filename appears in both branches with different content
     - Branches split at 1st commit

### ✅ Validation Points
- [x] Branch created from non-HEAD commit successfully
- [x] Same filename contains different query results per branch
- [x] Commit graph shows visual branch divergence
- [x] Switching branches updates file content correctly

---

## Test Scenario 4: Multi-File Join Query

**Demonstrates:** Loading multiple files, JOIN operations, commit snapshots with multiple files

### Steps

1. **Ensure Main Branch is Active**
   - Switch to `main` branch if not already active
   - Navigate to latest commit (should have `customers.csv` and `geographic_distribution.csv`)

2. **Pin Primary File**
   - Pin `customers.csv` (automatically loaded as `customers` table)

3. **Load Additional File**
   - Click **Load Files (0)** button in editor toolbar
   - Select `sales.csv` from the file menu
   - **Result:** 
     - Button updates to **Load Files (1)**
     - `sales.csv` loaded as `sales` table in DuckDB
     - Checkmark appears next to filename

4. **Execute JOIN Query**
   ```sql
   -- Query 5: Customer purchase patterns
   SELECT 
     c.customer_id,
     c.name,
     c.country,
     COUNT(s.transaction_id) as num_transactions,
     SUM(s.quantity) as total_items,
     ROUND(AVG(s.discount_applied), 2) as avg_discount
   FROM customers c
   LEFT JOIN sales s ON c.customer_id = s.customer_id
   GROUP BY c.customer_id, c.name, c.country
   HAVING COUNT(s.transaction_id) > 0
   ORDER BY num_transactions DESC;
   ```
   - Click **Run Query**
   - Review joined results (customer + sales data)

5. **Commit as New File**
   - Click **Commit**
   - ✅ Check **"Save as new file"**
   - File name: `customer_purchase_patterns.csv`
   - Message: `JOIN customers with sales for purchase analysis`
   - Click **Create Commit**
   - **Result:** New commit with **3 files**:
     - `customers.csv` (from parent)
     - `geographic_distribution.csv` (from parent)
     - `customer_purchase_patterns.csv` (new derived file from JOIN)

6. **Verify Snapshot Model**
   - View commit in **Commit History**
   - Expand commit card
   - **Observe:** All 3 files listed
   - Click any file to load it
   - **Key Point:** Complete snapshot - all files preserved at this point in time

### ✅ Validation Points
- [x] Multi-file loading works (Load Files button)
- [x] JOIN query across multiple tables executes successfully
- [x] Commit contains all files (snapshot model, not delta)
- [x] Source files (`customers.csv`, `sales.csv`) preserved unchanged
- [x] Derived file (`customer_purchase_patterns.csv`) created from JOIN

---

## Test Scenario 5: Physical Storage Demonstration

**Demonstrates:** OneLake storage structure, file references vs. copies, `.gitfs` internal folder

### Steps

1. **Create New Repository for Clean Demo**
   - Navigate to **Repositories** tab
   - Click **Create Repository** → Name: `StorageDemo`
   - Click **Save**

2. **Commit First File**
   - Add `products.csv` from Lakehouse
   - Pin and execute simple query:
   ```sql
   -- Query 6: Product category summary
   SELECT 
     category,
     COUNT(*) as product_count,
     AVG(price) as avg_price
   FROM products
   GROUP BY category;
   ```
   - Click **Commit**
   - ⬜ Overwrite mode
   - Message: `Initial product analysis`
   - Click **Create Commit**
   - Note the **commit ID** (e.g., `abc123...`)

3. **Open Lakehouse in OneLake Explorer**
   - Open Lakehouse item in Fabric workspace
   - Navigate to **Files** folder (OneLake perspective)
   - **Show:** Original `/Files/products.csv` still exists unchanged

4. **Navigate to .gitfs Folder**
   - In Lakehouse Files explorer, show `.gitfs` folder
   - Navigate to: `/Files/.gitfs/{item_id}/Data/`
   - **Observe:** 
     - Folder named with commit ID (e.g., `abc123...`)
     - Inside: `products.csv` (copy of query result)

5. **Key Demonstration Points**
   - **Original file NOT copied:** `/Files/products.csv` unchanged (reference source)
   - **Commit creates snapshot:** `/Files/.gitfs/{item_id}/Data/{commit_id}/products.csv` (result copy)
   - **Immutable storage:** Each commit gets its own folder (like Git objects)

6. **Create Second Commit to Show Duplication**
   - Back in Version Controlled Lakehouse item
   - Pin `products.csv` again, execute new query:
   ```sql
   -- Query 7: High-end products
   SELECT * FROM products WHERE price > 500 ORDER BY price DESC;
   ```
   - Commit with overwrite, message: `Filter high-end products`
   - Note new commit ID (e.g., `def456...`)

7. **Show Second Commit Folder in OneLake**
   - Refresh Lakehouse Files explorer
   - Navigate to `/Files/.gitfs/{item_id}/Data/`
   - **Observe:** 
     - **Two folders** now exist: `abc123.../` and `def456.../`
     - Each contains `products.csv` with different content
     - Original `/Files/products.csv` **still unchanged**

8. **Storage Model Summary**
   - ✅ Source files (in `/Files/`) are **read-only references**
   - ✅ Query results stored in `.gitfs/{item_id}/Data/{commit_id}/`
   - ✅ Each commit = complete snapshot = new folder
   - ✅ No delta compression (Git-style full snapshots)
   - ✅ Commit IDs used as folder names for immutability

### ✅ Validation Points
- [x] Original Lakehouse files remain unchanged
- [x] `.gitfs` internal folder structure visible
- [x] Each commit creates separate storage folder
- [x] Commit ID used as folder name
- [x] Multiple commits show file versioning clearly

---

## Recording Checklist

Before recording, ensure:

- [ ] Lakehouse has all 3 CSV files uploaded
- [ ] Version Controlled Lakehouse item created
- [ ] Screen recording software configured
- [ ] Browser zoom set appropriately
- [ ] Fabric workspace loaded

**Recording Tips:**
- 🎥 Use **1.5x slower mouse movements** for clarity
- 🎤 Narrate each action briefly
- ⏸️ Pause 2 seconds after each commit graph update (visual settle time)
- 📏 Zoom browser to 100% or 90% for readability

**Estimated Recording Time:** 12-15 minutes for all 5 scenarios

---

## Quick SQL Reference

All test queries consolidated for easy copy-paste:

```sql
-- Scenario 1: Query 1
SELECT country, COUNT(*) as customer_count, SUM(total_purchases) as total_purchases
FROM customers GROUP BY country ORDER BY total_purchases DESC;

-- Scenario 1: Query 2
SELECT customer_id, name, country, total_purchases,
  CASE WHEN total_purchases >= 15 THEN 'Platinum'
       WHEN total_purchases >= 10 THEN 'Gold' ELSE 'Silver' END as tier
FROM customers WHERE total_purchases >= 10 ORDER BY total_purchases DESC;

-- Scenario 2: Query 3 (to be reset)
SELECT SUBSTRING(email, POSITION('@' IN email) + 1) as email_domain,
  COUNT(*) as customer_count
FROM customers GROUP BY email_domain ORDER BY customer_count DESC;

-- Scenario 2: Query 3b (alternative history)
SELECT country, COUNT(*) as customer_count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
FROM customers GROUP BY country ORDER BY customer_count DESC;

-- Scenario 3: Query 4
SELECT country, total_purchases,
  ROUND(100.0 * total_purchases / SUM(total_purchases) OVER (), 2) as market_share_pct
FROM (SELECT country, SUM(total_purchases) as total_purchases FROM customers GROUP BY country)
ORDER BY total_purchases DESC LIMIT 5;

-- Scenario 4: Query 5 (JOIN)
SELECT c.customer_id, c.name, c.country,
  COUNT(s.transaction_id) as num_transactions,
  SUM(s.quantity) as total_items,
  ROUND(AVG(s.discount_applied), 2) as avg_discount
FROM customers c
LEFT JOIN sales s ON c.customer_id = s.customer_id
GROUP BY c.customer_id, c.name, c.country
HAVING COUNT(s.transaction_id) > 0
ORDER BY num_transactions DESC;

-- Scenario 5: Query 6
SELECT category, COUNT(*) as product_count, AVG(price) as avg_price
FROM products GROUP BY category;

-- Scenario 5: Query 7
SELECT * FROM products WHERE price > 500 ORDER BY price DESC;
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Lakehouse not appearing | Verify workspace permissions, refresh |
| DuckDB query fails | Check CSV format, verify file accessibility |
| Commit not in graph | Save item, refresh Commit History tab |
| Branch selector empty | Verify repository selected in tree |
| Load Files button disabled | Ensure commit is loaded and pinned file exists |

---

## Success Criteria

After completing all 5 scenarios:

✅ **Version Control Features:**
- [x] Repository and branch management
- [x] Overwrite mode for iterative refinement
- [x] Save as new file for derived datasets
- [x] Commit reset (alternative history)
- [x] Branch creation from any commit
- [x] Same filename with different content per branch

✅ **Data Operations:**
- [x] SQL query execution (DuckDB WASM)
- [x] Multi-file loading and JOIN queries
- [x] Complete snapshot model (all files in each commit)

✅ **Visualization:**
- [x] Commit graph with parent chains
- [x] Branch divergence display
- [x] Orphaned commit detection

✅ **Storage Model:**
- [x] `.gitfs` internal folder structure
- [x] Immutable commit folders
- [x] Source file references vs. result copies

**Next Steps:**
- Test with larger datasets
- Explore merge workflows (future feature)
- Integration with Fabric Pipelines

**Expected Result:**
- Results show customer statistics by country
- 7 rows returned (USA, Canada, UK, etc.)
- Results grid displays correctly formatted data

---

### 2.3 Commit Results as First Snapshot

**Steps:**
1. Click **Commit** in ribbon
2. Check the **"Save as new file"** checkbox
3. Enter new file name:
   ```
   customers_by_country.csv
   ```
4. Enter commit message:
   ```
   Initial commit: Customer demographics by country
   ```
5. Click **Create Commit**

**Expected Result:**
- Commit created with ID (e.g., `abc123...`)
- New file saved to `/Files/.gitfs/{item_id}/Data/{commit_id}/customers_by_country.csv`
- Original `customers.csv` file remains unchanged
- Commit appears in CommitGraph
- Branch `main` HEAD updated to new commit
- `parent_commit_id` is null (first commit)
- Save action enabled (metadata changed)

**Key Insight:**
- ✅ **Save As** mode creates a new derived file from query results
- 🔄 **Overwrite** mode (unchecked) would update the source file in a new commit
- This pattern enables data transformation lineage (source → derived datasets)

---

### 2.4 Verify Commit in Graph

**Steps:**
1. Switch to **Commit History** tab
2. Locate the first commit

**Expected Result:**
- Single commit node displayed
- Commit message visible: "Initial commit: Customer demographics by country"
- No parent connection (initial commit)
- Branch badge shows `main`
- Commit metadata displays:
  - Short hash (first 7 characters)
  - Author (your username)
  - Timestamp (relative time, e.g., "2 minutes ago")
  - File count: 1 file

---

## Test Scenario 3: Multi-Query Workflow and Parent Tracking

### 3.1 Execute Second Query (High Value Customers)

**Copy-paste SQL:**

```sql
-- Query 2: High-value customers (>10 purchases)
SELECT 
  customer_id,
  name,
  email,
  city,
  country,
  total_purchases,
  CASE 
    WHEN total_purchases >= 15 THEN 'Platinum'
    WHEN total_purchases >= 10 THEN 'Gold'
    ELSE 'Silver'
  END as customer_tier
FROM customers
WHERE total_purchases >= 10
ORDER BY total_purchases DESC;
```

**Steps:**
1. Clear previous query results (if needed)
2. Paste new query
3. Click **Run Query**

**Expected Result:**
- 4 rows returned (Emma Davis, Bob Smith, Grace Chen)
- customer_tier calculated correctly (Platinum, Gold)

---

### 3.2 Commit Second Query with Parent

**Steps:**
1. Click **Commit** in ribbon
2. Check the **"Save as new file"** checkbox
3. Enter new file name:
   ```
   high_value_customers.csv
   ```
4. Enter commit message:
   ```
   Add high-value customer segmentation (>10 purchases)
   ```
5. Click **Create Commit**

**Expected Result:**
- Second commit created
- `parent_commit_id` points to first commit
- New file saved as `high_value_customers.csv` (not overwriting previous file)
- CommitGraph shows visual connection (line) between commits
- Branch `main` HEAD now points to second commit
- First commit remains in history
- Repository now contains 2 files: `customers_by_country.csv` and `high_value_customers.csv`

---

### 3.3 Verify Parent-Child Relationship

**Steps:**
1. Go to **Commit History** tab
2. Observe visual graph

**Expected Result:**
- Two commit nodes displayed vertically
- Visual line connects second commit (top) to first commit (bottom)
- Latest commit has **HEAD** badge
- Chronological order: newest first

---

## Test Scenario 4: Branching for Experimental Analysis

### 4.1 Create Feature Branch from Current HEAD

**Steps:**
1. In **Commit History** tab, locate the latest commit (high-value customer segmentation)
2. Click commit card to expand actions
3. Click **Create Branch** button
4. Enter branch name: `feature/product-analysis`
5. Click **Create**

**Expected Result:**
- New branch `feature/product-analysis` created
- Branch HEAD points to same commit as `main`
- Branch selector in ribbon updates
- Automatically switched to new branch
- Repository explorer shows new branch

---

### 4.2 Load Product Data on Feature Branch

**Steps:**
1. Ensure `feature/product-analysis` is active branch (check ribbon)
2. Add file: `products.csv` to repository
3. Confirm file loaded in query panel

**Expected Result:**
- File appears under `feature/product-analysis` branch in tree
- Products table loaded in DuckDB

---

### 4.3 Execute Product Analysis Query

**Copy-paste SQL:**

```sql
-- Query 3: Product category analysis
SELECT 
  category,
  COUNT(*) as product_count,
  AVG(price) as avg_price,
  SUM(stock_quantity) as total_stock,
  MIN(price) as min_price,
  MAX(price) as max_price,
  ROUND(AVG(stock_quantity), 2) as avg_stock_per_product
FROM products
GROUP BY category
ORDER BY avg_price DESC;
```

**Steps:**
1. Paste query into editor
2. Run query

**Expected Result:**
- 3 categories returned: Furniture, Electronics, Accessories
- Aggregations calculated correctly
- Furniture has highest avg_price

---

### 4.4 Commit on Feature Branch

**Steps:**
1. Click **Commit** in ribbon
2. Check the **"Save as new file"** checkbox
3. Enter new file name:
   ```
   product_category_analysis.csv
   ```
4. Enter commit message:
   ```
   Analyze product categories (Electronics, Furniture, Accessories)
   ```
5. Click **Create Commit**

**Expected Result:**
- Third commit created
- `parent_commit_id` points to high-value customer commit
- New file saved as `product_category_analysis.csv`
- Commit appears on `feature/product-analysis` branch
- `main` branch remains unchanged (still at 2 commits)
- CommitGraph shows branch divergence
- Repository on feature branch now contains 3 files

---

### 4.5 Verify Branch Divergence in Graph

**Steps:**
1. Switch to **Commit History** tab
2. Observe commit graph structure

**Expected Result:**
- Three commits total
- Visual graph shows:
  - **main** branch: 2 commits in vertical line
  - **feature/product-analysis** branch: diverges from second commit
  - Branch labels/badges distinguish commits
- Latest commit on feature branch has HEAD indicator

---

## Test Scenario 5: Multi-Branch Operations

### 5.1 Switch Back to Main Branch

**Steps:**
1. Click **Branch Selector** dropdown in ribbon
2. Select `main`
3. Confirm branch switch

**Expected Result:**
- Active branch changes to `main`
- Repository explorer updates to show `main` files (only customers.csv)
- CommitGraph highlights `main` branch commits
- Feature branch commits become grayed/muted (not on current branch)
- Ribbon shows `main` as active branch

---

### 5.2 Add Sales Analysis on Main Branch

**Steps:**
1. Ensure `main` branch is active
2. Load file: `sales.csv`
3. Execute sales query:

**Copy-paste SQL:**

```sql
-- Query 4: Daily sales summary
SELECT 
  transaction_date,
  COUNT(DISTINCT transaction_id) as num_transactions,
  COUNT(DISTINCT customer_id) as unique_customers,
  SUM(quantity) as total_items_sold,
  SUM(discount_applied) as total_discounts
FROM sales
GROUP BY transaction_date
ORDER BY transaction_date;
```

**Steps:**
4. Run query
5. Click **Commit** in ribbon
6. Check **"Save as new file"**
7. Enter new file name:
   ```
   daily_sales_summary.csv
   ```
8. Enter commit message:
   ```
   Add daily sales transaction summary
   ```
9. Click **Create Commit**

**Expected Result:**
- Fourth commit created (third on `main` branch)
- New file saved as `daily_sales_summary.csv`
- `parent_commit_id` points to second commit (high-value customer)
- `main` branch now has 3 commits
- `feature/product-analysis` still has 3 total commits (1 unique)
- Branches have diverged at second commit
- Original `sales.csv` remains unchanged (source file preserved)

---

### 5.3 Visualize Full Commit Graph

**Steps:**
1. Open **Commit History** tab
2. Expand view to see all commits/branches

**Expected Result:**
- **Complete graph structure:**
  ```
  * [main HEAD] Daily sales transaction summary
  |
  * [common] High-value customer segmentation
  |\
  | * [feature/product-analysis HEAD] Product category analysis
  |
  * [common] Initial commit: Customer demographics
  ```
- Visual lines show parent-child relationships
- Branch labels differentiate commits
- Two branches visible with distinct paths

---

## Test Scenario 6: Advanced Queries and Snapshots

### 6.1 Customer Purchase Analysis with Joins

**Steps:**
1. Switch to `main` branch (if not already active)
2. Ensure both `customers.csv` and `sales.csv` are loaded
3. Execute complex join query:

**Copy-paste SQL:**

```sql
-- Query 5: Customer purchase patterns with product details
SELECT 
  c.customer_id,
  c.name,
  c.country,
  COUNT(s.transaction_id) as num_transactions,
  SUM(s.quantity) as total_items_purchased,
  SUM(s.discount_applied) as total_discounts_received,
  ROUND(AVG(s.discount_applied), 2) as avg_discount_per_transaction
FROM customers c
LEFT JOIN sales s ON c.customer_id = s.customer_id
GROUP BY c.customer_id, c.name, c.country
HAVING COUNT(s.transaction_id) > 0
ORDER BY num_transactions DESC;
```

**Steps:**
4. Review results
5. Click **Commit** in ribbon
6. Check **"Save as new file"**
7. Enter new file name:
   ```
   customer_purchase_patterns.csv
   ```
8. Enter commit message:
   ```
   Customer purchase patterns with transaction metrics
   ```
9. Click **Create Commit**

**Expected Result:**
- Results show joined data from both tables
- Aggregations calculated correctly
- New file saved as `customer_purchase_patterns.csv`
- New commit on `main` branch
- `parent_commit_id` points to previous `main` commit (sales summary)
- CommitGraph shows linear progression on `main`

---

### 6.2 Time-Based Sales Analysis

**Copy-paste SQL:**

```sql
-- Query 6: Payment method preference analysis
SELECT 
  payment_method,
  COUNT(*) as transaction_count,
  SUM(quantity) as total_items,
  SUM(discount_applied) as total_discounts,
  ROUND(AVG(discount_applied), 2) as avg_discount,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage_of_transactions
FROM sales
GROUP BY payment_method
ORDER BY transaction_count DESC;
```

**Steps:**
1. Run query
2. Click **Commit** in ribbon
3. Check **"Save as new file"**
4. Enter new file name:
   ```
   payment_method_analysis.csv
   ```
5. Enter commit message:
   ```
   Payment method preference and discount analysis
   ```
6. Click **Create Commit**

**Expected Result:**
- New commit created
- New file saved as `payment_method_analysis.csv`
- Parent chain: Customer patterns → Sales summary → High-value → Initial
- `main` branch now has 5 commits
- Complete snapshot stored

---

### 6.3 Using Overwrite Mode for Incremental Updates

**Scenario:** Update an existing derived file with corrected calculations.

**Steps:**
1. Pin the file `payment_method_analysis.csv` from the previous commit
2. Modify the query to add percentage formatting:

**Copy-paste SQL:**

```sql
-- Query 6b: Improved payment method analysis (with formatted percentages)
SELECT 
  payment_method,
  COUNT(*) as transaction_count,
  SUM(quantity) as total_items,
  SUM(discount_applied) as total_discounts,
  ROUND(AVG(discount_applied), 2) as avg_discount,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) || '%' as percentage_of_transactions
FROM sales
GROUP BY payment_method
ORDER BY transaction_count DESC;
```

3. Run query
4. Click **Commit** in ribbon
5. **Leave "Save as new file" UNCHECKED** (Overwrite mode)
6. Enter commit message:
   ```
   Fix: Add percentage formatting to payment method analysis
   ```
7. Click **Create Commit**

**Expected Result:**
- New commit created
- File path remains `payment_method_analysis.csv` (same name)
- Physical location updated to new commit ID: `/Files/.gitfs/{item_id}/Data/{new_commit_id}/payment_method_analysis.csv`
- Previous version still accessible in commit history
- `parent_commit_id` points to previous commit
- **Overwrite mode** preserves file path across version history
- This enables tracking changes to the same logical file over time

---

### 6.4 Multi-File Queries Using Additional File Loading

**Scenario:** Create a comprehensive analysis by joining multiple files from the same commit.

**Background:** 
Each commit contains a complete snapshot of all files. To perform queries across multiple tables (e.g., JOIN operations), you can load additional files from the current commit into DuckDB using the **Load Files** button.

**Steps:**

1. Ensure you're on the `main` branch at a recent commit that contains multiple files (e.g., `customers_by_country.csv`, `high_value_customers.csv`, `daily_sales_summary.csv`)

2. Pin the file `customers_by_country.csv` (this is your primary file, automatically loaded)

3. Click **Load Files (0)** button in the editor toolbar

4. From the menu, select `daily_sales_summary.csv` to load it into DuckDB
   - Note: The button counter updates to **Load Files (1)**
   - The file is loaded as table `daily_sales_summary`

5. Notice the loaded file now shows with a ✓ checkmark and "loaded as daily_sales_summary" badge

6. Execute a multi-table query:

**Copy-paste SQL:**

```sql
-- Query 8: Customer engagement - combining customer data with sales activity
SELECT 
  c.country,
  c.customer_count,
  s.num_transactions,
  s.unique_customers as active_customers,
  ROUND(100.0 * s.unique_customers / c.customer_count, 2) as engagement_rate_pct,
  s.total_items_sold,
  s.total_discounts,
  ROUND(s.total_discounts / s.num_transactions, 2) as avg_discount_per_transaction
FROM customers_by_country c
INNER JOIN daily_sales_summary s ON 1=1  -- Cross join for overall aggregates
ORDER BY c.customer_count DESC;
```

7. Review the results showing combined insights from both tables

8. Click **Commit** in ribbon

9. Check **"Save as new file"**

10. Enter new file name:
    ```
    customer_engagement_by_country.csv
    ```

11. Enter commit message:
    ```
    Add customer engagement analysis (JOIN customers + sales)
    ```

12. Click **Create Commit**

**Expected Result:**
- Query successfully joins data from `customers_by_country` and `daily_sales_summary` tables
- Results show combined metrics (customer count, transaction count, engagement rate)
- New file saved as `customer_engagement_by_country.csv`
- **Both source files preserved** in the commit (snapshot model)
- New commit contains 3+ files: all previous files + new derived file
- Load Files counter resets when switching commits/files
- Additional loaded files remain available for subsequent queries in the same session

**Key Insights:**
- ✅ **Snapshot Model**: Each commit contains all files at that point in time
- ✅ **Multi-Table Queries**: Load multiple files to perform JOINs and complex analyses
- ✅ **Table Names**: Loaded files use their file_path as table name (e.g., `customers_by_country`, `daily_sales_summary`)
- ✅ **Session Persistence**: Loaded files remain in DuckDB until you switch commits or close the panel
- ✅ **Source Preservation**: JOIN results create new derived files without modifying sources

---

## Test Scenario 7: Testing Snapshot Model

### 7.1 Create Branch from Earlier Commit

**Steps:**
1. Go to **Commit History** tab
2. Find the second commit: "High-value customer segmentation"
3. Click commit card → **Create Branch**
4. Name branch: `historical/customer-focus`
5. Create branch

**Expected Result:**
- New branch created from historical commit
- Branch HEAD points to old commit (not latest)
- Automatically switched to new branch
- Repository state reflects files from that commit only

---

### 7.2 Verify Snapshot Isolation

**Steps:**
1. Check Repository Explorer for `historical/customer-focus` branch
2. Verify available files

**Expected Result:**
- Only files from second commit are visible
- Sales data NOT present (added later on `main`)
- Product data NOT present (added on feature branch)
- Clean snapshot of repository state at that point in time

---

### 7.3 Execute Query on Historical Branch

**Copy-paste SQL:**

```sql
-- Query 7: Customer geographic distribution (historical snapshot)
SELECT 
  country,
  COUNT(*) as customer_count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
FROM customers
GROUP BY country
ORDER BY customer_count DESC;
```

**Steps:**
1. Run query on `historical/customer-focus` branch
2. Click **Commit** in ribbon
3. Check **"Save as new file"**
4. Enter new file name:
   ```
   geographic_distribution.csv
   ```
5. Enter commit message:
   ```
   Geographic distribution analysis (historical snapshot)
   ```
6. Click **Create Commit**

**Expected Result:**
- Query executes successfully
- New file saved as `geographic_distribution.csv`
- New commit created on historical branch
- `parent_commit_id` points to second commit
- Does NOT include later commits from `main`
- CommitGraph shows third branch path

---

## Test Scenario 8: Commit Graph Features

### 8.1 Test Orphaned Commit Detection

**Steps:**
1. Create a new commit on a temporary branch
2. Note the commit ID
3. Delete the branch
4. View **Commit History** tab

**Expected Result:**
- Commit still exists in graph
- Visual styling changes (grayed out, dashed border)
- Labeled as "orphaned" (unreachable from any branch HEAD)
- Still accessible but identified as unreferenced

---

### 8.2 Interactive Graph Navigation

**Steps:**
1. Hover over commit nodes in graph
2. Click expanding commit cards
3. Test file navigation from commits

**Expected Result:**
- Hover effects show parent connections highlighted
- Commit cards expand to show file lists
- Click file name → loads file in query panel
- Visual feedback with hover states (border color change, shadow)

---

### 8.3 Branch Creation from Any Commit

**Steps:**
1. Select any commit in the middle of history (e.g., third commit)
2. Create branch: `experiment/mid-point`
3. Observe graph

**Expected Result:**
- New branch created pointing to selected commit
- Visual branch indicator appears
- Branch selector updates with new branch
- Can make new commits that diverge from that point

---

## Test Scenario 9: Data Integrity and Version Control

### 9.1 Verify File Storage Structure

**Steps:**
1. Open Azure Storage Explorer or OneLake file browser
2. Navigate to `/Files/.gitfs/{item_id}/Data/`
3. List commit folders

**Expected Result:**
- Each commit has its own folder (commit ID)
- Files stored with original names
- Multiple commits = multiple complete snapshots
- No delta storage (full snapshots like Git)

---

### 9.2 Time Travel Query

**Steps:**
1. Switch to `main` branch (latest commit)
2. Note current query results
3. Switch to `historical/customer-focus` branch
4. Re-run same query

**Expected Result:**
- Results differ based on commit/branch
- Earlier branch shows older dataset state
- Demonstrates temporal versioning capability

---

### 9.3 Verify Commit Immutability

**Steps:**
1. Attempt to modify an existing commit (should not be possible)
2. View commit metadata

**Expected Result:**
- Commits cannot be edited
- Metadata is read-only
- Only option is to create new commits or delete existing ones
- Follows Git immutability principle

---

## Test Scenario 10: Edge Cases and Error Handling

### 10.1 Empty Query Results

**Copy-paste SQL:**

```sql
-- Query 8: Filter with no matches
SELECT * 
FROM customers 
WHERE total_purchases > 100;
```

**Steps:**
1. Run query
2. Attempt to commit empty results

**Expected Result:**
- Query executes successfully
- Empty result set displayed
- Commit button behavior (may be disabled or show warning)
- Graceful handling of empty data

---

### 10.2 Invalid SQL Query

**Copy-paste SQL:**

```sql
-- Query 9: Intentional syntax error
SELECT * FROM nonexistent_table;
```

**Steps:**
1. Run query

**Expected Result:**
- Error message displayed in results panel
- DuckDB error: "Table not found"
- Commit button remains disabled
- No corrupt state created

---

### 10.3 Branch Name Conflicts

**Steps:**
1. Attempt to create branch with existing name: `main`

**Expected Result:**
- Validation error: "Branch name already exists"
- Branch creation prevented
- User prompted to choose different name

---

### 10.4 Delete Branch with HEAD

**Steps:**
1. Select current active branch
2. Attempt to delete it

**Expected Result:**
- Warning message: "Cannot delete active branch"
- Deletion prevented
- User instructed to switch branches first

---

## Test Scenario 11: Performance and Usability

### 11.1 Large Result Set Handling

**Copy-paste SQL:**

```sql
-- Query 10: Cartesian product (large results)
SELECT 
  c.name as customer_name,
  p.product_name,
  p.category,
  p.price
FROM customers c
CROSS JOIN products p
WHERE c.total_purchases > 5
LIMIT 100;
```

**Steps:**
1. Run query
2. Observe results grid rendering
3. Scroll through results

**Expected Result:**
- Results render quickly (Fluent UI DataGrid)
- Smooth scrolling
- LIMIT clause prevents excessive data
- Commit creates manageable file size

---

### 11.2 Multiple Rapid Commits

**Steps:**
1. Execute 5 different simple queries in quick succession
2. Commit each immediately

**Expected Result:**
- All commits created successfully
- Parent chain maintained correctly
- CommitGraph updates in real-time
- No race conditions or duplicate commits

---

## Expected Test Results Summary

### ✅ Feature Validation Checklist

After completing all test scenarios:

- [ ] Repository creation and management
- [ ] Multi-branch support (create, switch, delete)
- [ ] Git-like commit model with parent tracking
- [ ] Commit graph visualization with parent-child lines
- [ ] SQL query execution (DuckDB WASM)
- [ ] File versioning with snapshots
- [ ] Commit metadata (hash, message, author, timestamp)
- [ ] Branch divergence visualization
- [ ] Orphaned commit detection
- [ ] Time travel queries (switch branches/commits)
- [ ] OneLake file storage (`/Files/.gitfs/{item_id}/Data/`)
- [ ] Immutable commit history
- [ ] Interactive commit graph navigation
- [ ] Branch creation from any commit
- [ ] Error handling (invalid SQL, empty results)
- [ ] 100% Fabric UX compliance (design tokens, styling)

---

## Troubleshooting

### Issue: Lakehouse not appearing in OneLakeView
**Solution:** 
- Verify Lakehouse access permissions
- Refresh workspace
- Check Lakehouse is in same workspace as workload

### Issue: DuckDB query fails
**Solution:**
- Check file format (CSV/Parquet only)
- Verify file is accessible in Lakehouse
- Review SQL syntax

### Issue: Commit not appearing in graph
**Solution:**
- Save item after committing
- Refresh Commit History tab
- Verify branch is selected correctly

### Issue: Branch selector doesn't update
**Solution:**
- Save item definition
- Switch tabs to force refresh
- Check repository selected in tree

---

## Advanced Test Scenarios

### Complex Join Query with All Three Datasets

**Copy-paste SQL:**

```sql
-- Advanced Query: Complete sales analysis with customer and product details
SELECT 
  s.transaction_id,
  s.transaction_date,
  c.name as customer_name,
  c.country,
  p.product_name,
  p.category,
  p.price,
  s.quantity,
  (p.price * s.quantity) as gross_amount,
  s.discount_applied,
  (p.price * s.quantity - s.discount_applied) as net_amount,
  s.payment_method
FROM sales s
JOIN customers c ON s.customer_id = c.customer_id
JOIN products p ON s.product_id = p.product_id
ORDER BY s.transaction_date DESC, s.transaction_id;
```

**Expected Insights:**
- Complete sales picture with customer and product context
- Revenue calculations (gross and net)
- Payment method patterns
- Geographic distribution of sales

---

### Aggregation Analysis Across All Data

**Copy-paste SQL:**

```sql
-- Advanced Query: Business intelligence summary
SELECT 
  c.country,
  COUNT(DISTINCT s.transaction_id) as total_transactions,
  COUNT(DISTINCT c.customer_id) as unique_customers,
  SUM(p.price * s.quantity) as total_revenue,
  SUM(s.discount_applied) as total_discounts,
  ROUND(AVG(p.price * s.quantity), 2) as avg_transaction_value,
  STRING_AGG(DISTINCT p.category, ', ') as categories_purchased
FROM sales s
JOIN customers c ON s.customer_id = c.customer_id
JOIN products p ON s.product_id = p.product_id
GROUP BY c.country
ORDER BY total_revenue DESC;
```

**Expected Insights:**
- Country-level business performance
- Revenue and discount analysis
- Customer concentration
- Product category preferences by geography

---

## Conclusion

This comprehensive test guide validates all major Version Controlled Lakehouse features:

🎯 **Core Version Control:**
- Git-like commits with parent tracking
- Multi-branch workflows  
- Snapshot-based complete repository state
- Immutable history

📊 **Data Operations:**
- SQL query execution across CSV/Parquet
- Complex joins and aggregations
- Interactive data exploration

🌲 **Visualization:**
- Commit graph with parent-child relationships
- Branch divergence display
- Orphaned commit detection

✨ **User Experience:**
- Fabric UX System compliance
- Intuitive navigation
- Real-time updates
- Error handling

**Next Steps:**
- Test with larger datasets (10K+ rows)
- Explore merge scenarios (future feature)
- Test concurrent multi-user workflows (future backend)
- Integration with Fabric Pipelines
