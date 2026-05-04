import pandas as pd
import os

path = r'd:\sahil\project\CSD SALE\data\2024\Grocery 2024'

for f in ['sale feb 24.xlsx', 'sale may 24.xlsx', 'sale oct 24.xlsx']:
    fp = os.path.join(path, f)
    if f.endswith('.xls') and not f.endswith('.xlsx'):
        df = pd.read_csv(fp, sep='\t')
    else:
        df = pd.read_excel(fp)
    
    print(f'=== {f} ===')
    group_total_idxs = df[df['S.No'] == 'Group Total'].index.tolist()
    print(f'Group Total at indices: {group_total_idxs}')
    print(f'Total rows: {len(df)}')
    
    for idx in group_total_idxs:
        if idx > 0:
            prev = df.loc[idx-1]
            gp = prev['GP_Index_No']
            item = prev['Item_Name']
            print(f'  Before idx {idx}: GP_Index={gp}, Item={item}')
        gt = df.loc[idx]
        print(f'  Group Total: Qty={gt["Qty"]}, R_Amt={gt["R_Amt"]}, Profit={gt["Profit"]}')
        if idx+1 < len(df):
            nxt = df.loc[idx+1]
            gp = nxt['GP_Index_No']
            sno = nxt['S.No']
            item = nxt['Item_Name']
            print(f'  After idx {idx}: S.No={sno}, GP_Index={gp}, Item={item}')
    
    print()
    print('Group order in file:')
    df_clean = df.dropna(subset=['GP_Index_No'])
    is_summary = df_clean['GP_Index_No'].str.contains('Bill|Refund|Net', na=True)
    data_rows = df_clean[~is_summary].copy()
    data_rows['prefix'] = data_rows['GP_Index_No'].str.extract(r'^([^/]+)/')[0]
    
    prev_group = None
    for i, row in data_rows.iterrows():
        if row['prefix'] != prev_group:
            print(f'  Row {i}: Group changes to {row["prefix"]} (S.No={row["S.No"]})')
            prev_group = row['prefix']
    print()
    print('---')
    print()
