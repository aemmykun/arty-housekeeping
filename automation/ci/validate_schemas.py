import os
import sys

def main():
    base = os.path.join(os.getcwd(), 'schemas')
    if not os.path.isdir(base):
        print('schemas directory not found')
        return 2
    files = [f for f in os.listdir(base) if f.endswith('.schema.csv')]
    if not files:
        print('No .schema.csv files found in schemas/')
        return 2
    print('Found schema files:')
    for f in files:
        full = os.path.join(base, f)
        size = os.path.getsize(full)
        print(f' - {f} ({size} bytes)')
        if size == 0:
            print('   ERROR: schema file is empty')
            return 2
    print('Schema validation OK')
    return 0

if __name__ == '__main__':
    sys.exit(main())
