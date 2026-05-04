import pandas as pd
df = pd.read_excel(r'd:\sahil\project\CSD SALE\data\2024\Grocery 2024\sale apr 24.xlsx')
print('Last 15 rows:')
for i in range(580, 595):
    row = df.iloc[i]
    sno = row['S.No']
    gp = row['GP_Index_No']
    item = row['Item_Name']
    print(f'  idx={i}: S.No={sno}, GP={gp}, Item={item}')
