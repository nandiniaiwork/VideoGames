import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
# Load dataset into a pandas DataFrame
df = pd.read_csv('vgsales.csv')

# Show the first 5 rows
print(df.head())
print(df.info())
print(df.isnull().sum())
print(df.describe())
print(df.columns)
print(df.shape)
print(df.sample(5))
print(df.dtypes)
df.isnull().sum()
df.dropna(subset=['Year', 'Global_Sales'], inplace=True)
df['Year'] = df['Year'].astype(int)
duplicates = df.duplicated().sum()
print("Number of duplicate rows:", duplicates)
print(df.info())
print(df.describe())
top_games = df.nlargest(10, 'Global_Sales')[['Name', 'Platform', 'Year', 'Genre', 'Global_Sales']]
print(top_games)
sales_by_year = df.groupby('Year')['Global_Sales'].sum()

plt.figure(figsize=(10,6))
plt.plot(sales_by_year.index, sales_by_year.values, marker='o', color='green')
plt.title('Global Video Game Sales by Year')
plt.xlabel('Year')
plt.ylabel('Sales (in millions)')
plt.grid(True)
plt.show()
platform_sales = df.groupby('Platform')['Global_Sales'].sum().sort_values(ascending=False).head(10)

plt.figure(figsize=(10,6))
platform_sales.plot(kind='bar', color='skyblue')
plt.title('Top 10 Platforms by Global Sales')
plt.xlabel('Platform')
plt.ylabel('Total Sales (in millions)')
plt.show()
genre_sales = df.groupby('Genre')['Global_Sales'].sum().sort_values(ascending=False)

plt.figure(figsize=(10,6))
genre_sales.plot(kind='bar', color='orange')
plt.title('Total Global Sales by Genre')
plt.xlabel('Genre')
plt.ylabel('Sales (in millions)')
plt.show()
regions = df[['NA_Sales', 'EU_Sales', 'JP_Sales', 'Other_Sales']].sum()

plt.figure(figsize=(6,6))
regions.plot(kind='pie', autopct='%1.1f%%', startangle=140)
plt.title('Regional Sales Distribution')
plt.ylabel('')
plt.show()
plt.figure(figsize=(8,6))
plt.scatter(df['NA_Sales'], df['EU_Sales'], alpha=0.5)
plt.title('NA Sales vs EU Sales')
plt.xlabel('North America Sales (millions)')
plt.ylabel('Europe Sales (millions)')
plt.show()
publisher_sales = df.groupby('Publisher')['Global_Sales'].sum().sort_values(ascending=False).head(10)

plt.figure(figsize=(10,6))
publisher_sales.plot(kind='bar', color='purple')
plt.title('Top 10 Publishers by Global Sales')
plt.xlabel('Publisher')
plt.ylabel('Sales (in millions)')
plt.show()
# Save charts as image files
plt.savefig('global_sales_by_year.png')
plt.savefig('top_platforms.png')
plt.savefig('genre_sales.png')
plt.savefig('regional_sales_pie.png')

# Save data summaries
df.to_csv('cleaned_vgsales.csv', index=False)
