import psycopg2
import sys

def main():
    conn_str = "postgresql://postgres.bqdkcaacqsedmxeiroyw:lumora%242026@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"
    schema_path = "../supabase/schema.sql"

    try:
        with open(schema_path, 'r') as f:
            sql = f.read()

        print("Connecting to database...")
        conn = psycopg2.connect(conn_str)
        conn.autocommit = True
        cur = conn.cursor()

        print("Executing schema...")
        cur.execute(sql)
        
        print("Schema executed successfully!")
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
