-- Migration: Normalize transaction categories and add check constraint
-- Allowed values: 'Food & Groceries', 'Books & Supplies', 'Rent & Utilities', 'Transport', 'Entertainment', 'Health', 'Other Discretionary', 'Income'

DO $$
BEGIN
  -- Normalize column `kategori` if exists (schema uses Indonesian column names)
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'transactions' AND column_name = 'kategori'
  ) THEN
    -- 1. One-time data normalization for legacy values
    UPDATE public.transactions
    SET kategori = CASE
      WHEN lower(trim(kategori)) IN ('food', 'food & dining', 'dining & coffee', 'groceries', 'dining', 'makan', 'makanan', 'minuman', 'coffee', 'cafe', 'snack', 'jajan') OR lower(kategori) LIKE '%food%' OR lower(kategori) LIKE '%makan%' THEN 'Food & Groceries'
      WHEN lower(trim(kategori)) IN ('books', 'books & supplies', 'books & course packs', 'supplies', 'campus printing', 'buku', 'alat tulis', 'print') OR lower(kategori) LIKE '%book%' OR lower(kategori) LIKE '%buku%' THEN 'Books & Supplies'
      WHEN lower(trim(kategori)) IN ('rent & utilities', 'rent & housing', 'housing & utilities', 'utilities', 'rent', 'housing', 'kost', 'kos', 'sewa', 'listrik', 'air', 'wifi') OR lower(kategori) LIKE '%rent%' OR lower(kategori) LIKE '%utilit%' THEN 'Rent & Utilities'
      WHEN lower(trim(kategori)) IN ('transport', 'transportation', 'travel', 'bensin', 'ojol', 'gojek', 'grab', 'kereta', 'bus', 'angkot', 'taxi') OR lower(kategori) LIKE '%transport%' THEN 'Transport'
      WHEN lower(trim(kategori)) IN ('entertainment', 'tech subscriptions', 'games', 'game', 'movie', 'bioskop', 'nonton', 'hiburan', 'netflix', 'spotify') OR lower(kategori) LIKE '%entertain%' THEN 'Entertainment'
      WHEN lower(trim(kategori)) IN ('health', 'healthcare', 'medical', 'medicine', 'obat', 'dokter', 'kesehatan', 'klinik') OR lower(kategori) LIKE '%health%' THEN 'Health'
      WHEN lower(trim(kategori)) IN ('income', 'stipend & income', 'stipend', 'salary', 'gaji', 'pemasukan') OR (tipe IS NOT NULL AND tipe = 'pemasukan') THEN 'Income'
      WHEN kategori IN ('Food & Groceries', 'Books & Supplies', 'Rent & Utilities', 'Transport', 'Entertainment', 'Health', 'Other Discretionary', 'Income') THEN kategori
      ELSE 'Other Discretionary'
    END;

    -- 2. Drop existing constraint if any and add strict CHECK constraint
    ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_kategori_check;
    ALTER TABLE public.transactions ADD CONSTRAINT transactions_kategori_check 
      CHECK (kategori IN (
        'Food & Groceries',
        'Books & Supplies',
        'Rent & Utilities',
        'Transport',
        'Entertainment',
        'Health',
        'Other Discretionary',
        'Income'
      ));
  END IF;

  -- Also check if column `category` exists
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'transactions' AND column_name = 'category'
  ) THEN
    UPDATE public.transactions
    SET category = CASE
      WHEN lower(trim(category)) IN ('food', 'food & dining', 'dining & coffee', 'groceries', 'dining', 'makan', 'makanan', 'minuman', 'coffee', 'cafe', 'snack', 'jajan') OR lower(category) LIKE '%food%' OR lower(category) LIKE '%makan%' THEN 'Food & Groceries'
      WHEN lower(trim(category)) IN ('books', 'books & supplies', 'books & course packs', 'supplies', 'campus printing', 'buku', 'alat tulis', 'print') OR lower(category) LIKE '%book%' OR lower(category) LIKE '%buku%' THEN 'Books & Supplies'
      WHEN lower(trim(category)) IN ('rent & utilities', 'rent & housing', 'housing & utilities', 'utilities', 'rent', 'housing', 'kost', 'kos', 'sewa', 'listrik', 'air', 'wifi') OR lower(category) LIKE '%rent%' OR lower(category) LIKE '%utilit%' THEN 'Rent & Utilities'
      WHEN lower(trim(category)) IN ('transport', 'transportation', 'travel', 'bensin', 'ojol', 'gojek', 'grab', 'kereta', 'bus', 'angkot', 'taxi') OR lower(category) LIKE '%transport%' THEN 'Transport'
      WHEN lower(trim(category)) IN ('entertainment', 'tech subscriptions', 'games', 'game', 'movie', 'bioskop', 'nonton', 'hiburan', 'netflix', 'spotify') OR lower(category) LIKE '%entertain%' THEN 'Entertainment'
      WHEN lower(trim(category)) IN ('health', 'healthcare', 'medical', 'medicine', 'obat', 'dokter', 'kesehatan', 'klinik') OR lower(category) LIKE '%health%' THEN 'Health'
      WHEN lower(trim(category)) IN ('income', 'stipend & income', 'stipend', 'salary', 'gaji', 'pemasukan') THEN 'Income'
      WHEN category IN ('Food & Groceries', 'Books & Supplies', 'Rent & Utilities', 'Transport', 'Entertainment', 'Health', 'Other Discretionary', 'Income') THEN category
      ELSE 'Other Discretionary'
    END;

    ALTER TABLE public.transactions DROP CONSTRAINT IF EXISTS transactions_category_check;
    ALTER TABLE public.transactions ADD CONSTRAINT transactions_category_check 
      CHECK (category IN (
        'Food & Groceries',
        'Books & Supplies',
        'Rent & Utilities',
        'Transport',
        'Entertainment',
        'Health',
        'Other Discretionary',
        'Income'
      ));
  END IF;
END $$;
