import pandas as pd
import sys

pd.read_html(sys.argv[1])[0].to_csv(sys.argv[2], index=False)
