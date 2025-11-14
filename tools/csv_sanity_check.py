import pandas as pd,sys
assert list(pd.read_csv(sys.argv[1],nrows=0).columns)==list(pd.read_csv(sys.argv[2],nrows=0).columns)
