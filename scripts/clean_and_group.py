"""
CSD Grocery 2024 - Data Cleaning & Grouping Script
===================================================
Cleans 11 monthly sales files (Feb-Dec 2024), expands embedded rows,
creates a separate Group column, renumbers groups sequentially (I, II, III, IV, V),
and outputs cleaned Excel files.

Group Mapping:
  Original I   -> I   (Personal care, toiletries, razors, cosmetics)
  Original II  -> II  (Household items, cleaning supplies, kitchenware)
  Original III -> III (Footwear polish, hardware, luggage, accessories)
  Original IV  -> IV  (Watches, electronics)
  Original VI  -> V   (Food, beverages, biscuits, oils, health products)

Critical Fix: Many Excel files have hundreds of rows embedded as tab-separated
text within single Item_Name cells. This script expands those into proper rows.
"""

import pandas as pd
import numpy as np
import os
import re
import io
import argparse

# --- Configuration ---

def get_config(year, category):
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    input_dir = os.path.join(base_dir, 'data', str(year), f'{category} {year}')
    output_dir = os.path.join(input_dir, 'cleaned')
    return input_dir, output_dir

# The 15 expected columns in order
EXPECTED_COLS = ['S.No', 'GP_Index_No', 'pluno', 'Item_Name', 'W_Rate', 'R_Rate',
                 'Qty', 'Refund_Qty', 'Net_Qty', 'R_Amt', 'W_Amt', 'Profit',
                 'O_B', 'Closing_Stock', 'Net_Tax']

JUNK_SNO_KEYWORDS = [
    'report total', 'summary details', 'please check ledger',
    'bill', 'refund amt', 'net amt',
]

def get_group_rename(category):
    if category.lower() == 'liquor':
        return {'V': 'VI'}
    else:
        return {
            'I': 'I',
            'II': 'II',
            'III': 'III',
            'IV': 'IV',
            'VI': 'V',
        }

# --- Embedded Data Expansion ---

def expand_embedded_rows(df):
    """
    Detect rows where Item_Name (or other text columns) contain tab-separated
    multi-row data and expand them into proper DataFrame rows.
    
    Some Excel cells contain entire blocks of data like:
    "ITEM NAME\t142.91\t150.06\t10\t0\t10\t..._x000D_\n343\tVI/091578A\t91578\t..."
    
    These need to be parsed and expanded into individual rows.
    """
    expanded_rows = []
    rows_to_drop = []

    for idx, row in df.iterrows():
        item_val = str(row.get('Item_Name', ''))

        # Check if this cell has embedded tab-separated data
        if '\t' not in item_val:
            continue

        # This row has embedded data - we need to parse it
        rows_to_drop.append(idx)

        # The first part of the Item_Name (before the first \t) is the actual item name
        # for the current row. The rest of the content after tabs are additional columns
        # and/or additional rows.
        
        # Build the full text block: start with what we know about the current row,
        # then append the embedded content
        # The current row's data up to Item_Name is: S.No, GP_Index_No, pluno, then Item_Name starts
        # The embedded content starts mid-way through the current row's data
        
        # Strategy: reconstruct the full text from the original row + embedded data
        # Current row values for first 3 columns
        sno_val = str(row['S.No']) if pd.notna(row['S.No']) else ''
        gp_val = str(row['GP_Index_No']) if pd.notna(row['GP_Index_No']) else ''
        pluno_val = str(row['pluno']) if pd.notna(row['pluno']) else ''
        
        # The Item_Name contains: "ACTUAL_ITEM\tW_Rate\tR_Rate\t...\n NEXT_ROW\t..."
        # We need to reconstruct full rows
        
        # Split by newlines to get individual embedded rows
        lines = item_val.replace('_x000D_', '').split('\n')
        
        # First line is a continuation of the current row (the rest of the columns)
        # Format: "ITEM_NAME\tW_Rate\tR_Rate\tQty\t..."
        first_line_parts = lines[0].split('\t')
        
        # Build the first row (current row with its real item name + rest of columns)
        first_row_text = f"{sno_val}\t{gp_val}\t{pluno_val}\t" + lines[0]
        
        # Combine all lines into a single TSV block
        all_lines = [first_row_text]
        for line in lines[1:]:
            line = line.strip()
            if line:
                all_lines.append(line)
        
        # Parse the TSV block
        tsv_text = '\n'.join(all_lines)
        try:
            embedded_df = pd.read_csv(io.StringIO(tsv_text), sep='\t',
                                       header=None, dtype=str,
                                       on_bad_lines='warn')
            
            # Map columns based on position (up to 15 columns)
            for _, erow in embedded_df.iterrows():
                new_row = {}
                values = erow.tolist()
                for i, col_name in enumerate(EXPECTED_COLS):
                    if i < len(values) and pd.notna(values[i]):
                        new_row[col_name] = str(values[i]).strip()
                    else:
                        new_row[col_name] = np.nan
                expanded_rows.append(new_row)
                
        except Exception as e:
            print(f"    WARNING: Failed to parse embedded data at index {idx}: {e}")
            # Try line-by-line fallback
            for line in all_lines:
                parts = line.split('\t')
                new_row = {}
                for i, col_name in enumerate(EXPECTED_COLS):
                    if i < len(parts) and parts[i].strip():
                        new_row[col_name] = parts[i].strip()
                    else:
                        new_row[col_name] = np.nan
                expanded_rows.append(new_row)

    if not rows_to_drop:
        return df, 0

    # Drop the original problematic rows
    df_clean = df.drop(index=rows_to_drop)
    
    # Create DataFrame from expanded rows
    if expanded_rows:
        df_expanded = pd.DataFrame(expanded_rows)
        # Ensure same columns
        for col in EXPECTED_COLS:
            if col not in df_expanded.columns:
                df_expanded[col] = np.nan
        df_expanded = df_expanded[EXPECTED_COLS]
        
        # Append expanded rows
        df_result = pd.concat([df_clean, df_expanded], ignore_index=True)
    else:
        df_result = df_clean.reset_index(drop=True)

    return df_result, len(expanded_rows)


# --- Cleaning Helpers ---

def extract_group_prefix(gp_index):
    """Extract the Roman numeral prefix from GP_Index_No."""
    if pd.isna(gp_index):
        return None
    match = re.match(r'^([IVX]+)/', str(gp_index))
    if match:
        return match.group(1)
    return None


def clean_gp_index(gp_index):
    """Remove the Roman numeral prefix from GP_Index_No."""
    if pd.isna(gp_index):
        return gp_index
    match = re.match(r'^[IVX]+/(.+)$', str(gp_index))
    if match:
        return match.group(1)
    return gp_index


def clean_numeric(value):
    """Clean a numeric string: strip apostrophes, commas, convert to float."""
    if pd.isna(value):
        return np.nan
    s = str(value).strip()
    s = s.lstrip("'")
    s = s.replace(',', '')
    if s == '' or s == '-':
        return np.nan
    try:
        return float(s)
    except ValueError:
        return np.nan


def is_data_row(row):
    """Check if a row is an actual product data row (not summary/junk)."""
    sno = str(row.get('S.No', '')).strip().lower()
    gp = str(row.get('GP_Index_No', '')).strip().lower()

    # Check for junk patterns in S.No
    for keyword in JUNK_SNO_KEYWORDS:
        if keyword in sno:
            return False

    # Check for summary GP values
    if gp in ['bill amt', 'refund amt', 'net amt', 'tax amt', 'nan', '']:
        # Only mark as non-data if S.No also looks non-numeric
        if sno in ['', 'nan', 'bill', 'refund amt', 'net amt']:
            return False

    return True


def is_group_total(row):
    """Check if a row is a Group Total row."""
    sno = str(row.get('S.No', '')).strip()
    return sno == 'Group Total'


def load_file(filepath):
    """Load file handling both .xlsx and TSV-disguised-.xls formats."""
    filename = os.path.basename(filepath)
    
    aliases = {'GP_Index': 'GP_Index_No', 'Refund_Q': 'Refund_Qty', 'Closing_St': 'Closing_Stock'}

    # Try as Excel first
    try:
        df = pd.read_excel(filepath, engine='openpyxl')
        df = df.rename(columns=aliases)
        if len(df.columns) >= 15:
            return df
    except Exception:
        pass
    
    # Try as TSV (August file case)
    try:
        df = pd.read_csv(filepath, sep='\t', dtype=str)
        # Drop unnamed columns
        unnamed = [c for c in df.columns if 'Unnamed' in str(c)]
        if unnamed:
            df = df.drop(columns=unnamed)
        df = df.rename(columns=aliases)
        return df
    except Exception:
        pass
    
    # Fallback: try with xlrd
    try:
        df = pd.read_excel(filepath, engine='xlrd')
        df = df.rename(columns=aliases)
        return df
    except Exception as e:
        raise ValueError(f"Cannot load {filename}: {e}")


# --- Main Processing ---

def process_file(filepath, group_rename, is_liquor=False):
    """Process a single monthly file: load, expand, clean, group."""
    filename = os.path.basename(filepath)
    
    # Extract month from filename
    month_match = re.search(r'(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)', 
                            filename.lower())
    month = month_match.group(1) if month_match else 'unknown'
    month_full = {
        'jan': 'January', 'feb': 'February', 'mar': 'March', 'apr': 'April',
        'may': 'May', 'jun': 'June', 'jul': 'July', 'aug': 'August',
        'sep': 'September', 'oct': 'October', 'nov': 'November', 'dec': 'December'
    }.get(month, month)
    
    print(f"\n{'='*60}")
    print(f"Processing: {filename} ({month_full})")
    print(f"{'='*60}")
    
    # Step 1: Load
    df = load_file(filepath)
    print(f"  [1] Loaded: {df.shape[0]} rows x {df.shape[1]} cols")
    
    # Ensure all expected columns exist
    for col in EXPECTED_COLS:
        if col not in df.columns:
            df[col] = np.nan
    
    # Step 2: Expand embedded rows
    df, expanded_count = expand_embedded_rows(df)
    if expanded_count > 0:
        print(f"  [2] Expanded {expanded_count} embedded rows -> now {len(df)} total rows")
    else:
        print(f"  [2] No embedded rows found")
    
    # Step 3: Classify rows
    data_rows = []
    group_total_rows = []
    junk_rows = []
    
    for idx, row in df.iterrows():
        if is_group_total(row):
            group_total_rows.append(idx)
        elif not is_data_row(row):
            junk_rows.append(idx)
        else:
            data_rows.append(idx)
    
    print(f"  [3] Classified: {len(data_rows)} data, {len(group_total_rows)} group totals, {len(junk_rows)} junk")
    
    # Step 4: Process data rows
    df_data = df.loc[data_rows].copy()
    
    # Drop rows with NaN GP_Index_No (remaining artifacts)
    before_drop = len(df_data)
    df_data = df_data.dropna(subset=['GP_Index_No'])
    # Also drop rows where GP_Index_No doesn't match expected pattern
    valid_gp = df_data['GP_Index_No'].str.match(r'^[IVX]+/\d+', na=False)
    df_data = df_data[valid_gp]
    after_drop = len(df_data)
    if before_drop != after_drop:
        print(f"  [4] Dropped {before_drop - after_drop} rows with invalid/null GP_Index_No")
    
    # Step 5: Extract and rename groups
    df_data['_original_group'] = df_data['GP_Index_No'].apply(extract_group_prefix)
    df_data['Group'] = df_data['_original_group'].map(group_rename)
    
    # Check for unmapped groups
    unmapped = df_data[df_data['Group'].isna() & df_data['_original_group'].notna()]
    if len(unmapped) > 0:
        print(f"  [!] WARNING: {len(unmapped)} rows with unmapped group prefix:")
        for _, r in unmapped.head(5).iterrows():
            print(f"      GP={r['GP_Index_No']}, Item={r['Item_Name']}")
    
    # Step 6: Clean GP_Index_No (remove prefix)
    df_data['GP_Index_No'] = df_data['GP_Index_No'].apply(clean_gp_index)
    
    # Step 7: Clean S.No
    df_data['S.No'] = df_data['S.No'].apply(lambda x: str(x).strip().lstrip('#') if pd.notna(x) else x)
    
    # Step 8: Clean numeric columns
    for col in ['W_Rate', 'R_Rate', 'Qty', 'Refund_Qty', 'Net_Qty',
                'R_Amt', 'W_Amt', 'Profit', 'O_B', 'Closing_Stock', 'Net_Tax']:
        df_data[col] = df_data[col].apply(clean_numeric)
    
    # Step 9: Clean pluno
    df_data['pluno'] = df_data['pluno'].apply(
        lambda x: str(int(float(str(x)))) if pd.notna(x) and str(x).strip() else x
    )
    
    # Step 10: Clean Item_Name
    df_data['Item_Name'] = df_data['Item_Name'].apply(
        lambda x: str(x).strip().rstrip('|').strip() if pd.notna(x) else x
    )
    
    # Step 11: Process Group Total rows
    df_gt = df.loc[group_total_rows].copy() if group_total_rows else pd.DataFrame()
    
    if len(df_gt) > 0:
        # Assign group to each Group Total based on preceding data rows
        gt_groups = []
        for gt_idx in group_total_rows:
            preceding = [d for d in data_rows if d < gt_idx]
            if preceding:
                last_idx = max(preceding)
                last_gp = df.loc[last_idx, 'GP_Index_No']
                prefix = extract_group_prefix(last_gp) if pd.notna(last_gp) else None
                gt_groups.append(group_rename.get(prefix, 'Unknown') if prefix else 'Unknown')
            else:
                gt_groups.append('Unknown')
        
        df_gt['Group'] = gt_groups
        df_gt['S.No'] = 'Group Total'
        
        # Clean numeric columns in group totals
        for col in ['W_Rate', 'R_Rate', 'Qty', 'Refund_Qty', 'Net_Qty',
                    'R_Amt', 'W_Amt', 'Profit', 'O_B', 'Closing_Stock', 'Net_Tax']:
            if col in df_gt.columns:
                df_gt[col] = df_gt[col].apply(clean_numeric)
    
    # Step 12: Assemble final output: group by group with totals
    final_cols = ['S.No', 'Group', 'GP_Index_No', 'pluno', 'Item_Name',
                  'W_Rate', 'R_Rate', 'Qty', 'Refund_Qty', 'Net_Qty',
                  'R_Amt', 'W_Amt', 'Profit', 'O_B', 'Closing_Stock', 'Net_Tax']
    
    parts = []
    if is_liquor:
        group_order = ['VI']
    else:
        group_order = ['I', 'II', 'III', 'IV', 'V']
    
    for grp in group_order:
        grp_data = df_data[df_data['Group'] == grp].copy()
        if len(grp_data) == 0:
            continue
        
        # Sort by original S.No within group (convert to int for sorting)
        try:
            grp_data['_sort_key'] = pd.to_numeric(grp_data['S.No'], errors='coerce')
            grp_data = grp_data.sort_values('_sort_key').drop(columns=['_sort_key'])
        except Exception:
            pass
        
        parts.append(grp_data)
        
        # Add group total if exists
        if len(df_gt) > 0:
            gt = df_gt[df_gt['Group'] == grp]
            if len(gt) > 0:
                parts.append(gt)
    
    if parts:
        df_final = pd.concat(parts, ignore_index=True)
    else:
        df_final = df_data
    
    # Ensure columns exist
    for col in final_cols:
        if col not in df_final.columns:
            df_final[col] = np.nan
    
    # Drop internal columns
    df_final = df_final[[c for c in final_cols if c in df_final.columns]]
    
    # Step 13: Re-serialize S.No continuously (skip Group Total rows)
    serial = 1
    new_sno = []
    for _, row in df_final.iterrows():
        if str(row['S.No']).strip() == 'Group Total':
            new_sno.append('Group Total')
        else:
            new_sno.append(serial)
            serial += 1
    df_final['S.No'] = new_sno
    
    # Remove the _original_group column if it leaked through
    if '_original_group' in df_final.columns:
        df_final = df_final.drop(columns=['_original_group'])
    
    # Step 14: Summary
    data_only = df_final[df_final['S.No'] != 'Group Total']
    gt_only = df_final[df_final['S.No'] == 'Group Total']
    
    print(f"  [DONE] Final: {len(data_only)} data rows + {len(gt_only)} group totals")
    print(f"  Group distribution:")
    for grp in group_order:
        count = len(data_only[data_only['Group'] == grp])
        if count > 0:
            print(f"    Group {grp}: {count} products")
    
    return df_final, month, month_full


def validate_groups(df, month_full, is_liquor=False):
    """Validate group integrity - watches in IV, no cross-contamination."""
    data_only = df[df['S.No'] != 'Group Total'].copy()
    
    issues = []
    
    if is_liquor:
        for _, row in data_only.iterrows():
            if row['Group'] != 'VI':
                issues.append(f"    Item not in Group VI: {row['GP_Index_No']} - {row['Item_Name']}")
    else:
        watch_keywords = ['WATCH', 'WTCH', 'TITAN ', ' OMAX', 'FASTTRACH', 'FASTRACK', ' SONATA ']
        watch_gp_patterns = ['021264', '061277', '061278', '061281', '061283', '061284', '061905', '061500', '061412', '061526', '061502']
        
        for _, row in data_only.iterrows():
            gp = str(row['GP_Index_No'])
            item = str(row['Item_Name']).upper()
            group = row['Group']
            
            is_watch = (any(kw in item for kw in watch_keywords) or 
                        any(pat in gp for pat in watch_gp_patterns))
            
            if is_watch and group != 'IV':
                issues.append(f"    WATCH item in Group {group}: {gp} - {row['Item_Name']}")
            
            if group == 'IV' and not is_watch:
                issues.append(f"    Non-WATCH item in Group IV: {gp} - {row['Item_Name']}")
    
    if issues:
        print(f"  [WARNING] Group integrity issues in {month_full}:")
        for issue in issues:
            print(issue)
        return False
    else:
        print(f"  [OK] Group integrity validated for {month_full}")
        return True


# --- Main ---

def main():
    parser = argparse.ArgumentParser(description="Clean CSD Data")
    parser.add_argument("--year", default=2024, type=int, help="Year to process (e.g. 2024 or 2025)")
    parser.add_argument("--category", default="Grocery", type=str, help="Category (Grocery or Liquor)")
    args = parser.parse_args()
    
    year_short = str(args.year)[-2:]
    INPUT_DIR, OUTPUT_DIR = get_config(args.year, args.category)
    group_rename = get_group_rename(args.category)
    is_liquor = args.category.lower() == 'liquor'
    
    print("=" * 60)
    print(f"CSD {args.category} {args.year} - Data Cleaning & Grouping")
    print("=" * 60)
    
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    files = sorted([f for f in os.listdir(INPUT_DIR)
                    if f.lower().endswith(('.xlsx', '.xls')) and not f.startswith('~$')])
    
    print(f"\nFound {len(files)} files in: {INPUT_DIR}")
    
    all_valid = True
    summary = []
    
    for filename in files:
        filepath = os.path.join(INPUT_DIR, filename)
        
        try:
            df_cleaned, month, month_full = process_file(filepath, group_rename, is_liquor)
            
            # Validate
            valid = validate_groups(df_cleaned, month_full, is_liquor)
            if not valid:
                all_valid = False
            
            # Save
            if is_liquor:
                output_name = f"liq_sale_{month}_{year_short}_cleaned.xlsx"
            else:
                output_name = f"sale_{month}_{year_short}_cleaned.xlsx"
            output_path = os.path.join(OUTPUT_DIR, output_name)
            df_cleaned.to_excel(output_path, index=False, engine='openpyxl')
            print(f"  Saved: {output_name}")
            
            data_count = len(df_cleaned[df_cleaned['S.No'] != 'Group Total'])
            gt_count = len(df_cleaned[df_cleaned['S.No'] == 'Group Total'])
            summary.append((month_full, data_count, gt_count, output_name))
            
        except Exception as e:
            print(f"\n  [ERROR] Failed to process {filename}: {e}")
            import traceback
            traceback.print_exc()
            all_valid = False
    
    # Final summary
    print(f"\n{'='*60}")
    print("FINAL SUMMARY")
    print(f"{'='*60}")
    print(f"{'Month':<12} {'Data Rows':>10} {'Group Totals':>13} {'Output File'}")
    print("-" * 60)
    total_data = 0
    total_gt = 0
    for month_full, data_count, gt_count, output_name in summary:
        print(f"{month_full:<12} {data_count:>10} {gt_count:>13} {output_name}")
        total_data += data_count
        total_gt += gt_count
    print("-" * 60)
    print(f"{'TOTAL':<12} {total_data:>10} {total_gt:>13}")
    print(f"\nGroup integrity: {'[OK] ALL PASSED' if all_valid else '[WARNING] ISSUES FOUND'}")
    print(f"Output directory: {OUTPUT_DIR}")


if __name__ == '__main__':
    main()
