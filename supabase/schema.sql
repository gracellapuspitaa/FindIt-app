CREATE TABLE public.barang_hilang (
  id_hilang bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  nama_barang text NOT NULL,
  kategori text NOT NULL,
  lokasi_terakhir text NOT NULL,
  tanggal_hilang date NOT NULL,
  ciri_ciri text NOT NULL,
  wa_pelapor text NOT NULL,
  image_url text,
  status text DEFAULT 'Belum Ditemukan'::text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  nim_pengupload text,
  CONSTRAINT barang_hilang_pkey PRIMARY KEY (id_hilang)
);
CREATE TABLE public.fakultas (
  id_fakultas integer NOT NULL DEFAULT nextval('fakultas_id_fakultas_seq'::regclass),
  nama_fakultas text NOT NULL,
  singkatan text,
  CONSTRAINT fakultas_pkey PRIMARY KEY (id_fakultas)
);
CREATE TABLE public.items (
  id_item integer NOT NULL DEFAULT nextval('items_id_item_seq'::regclass),
  nama_barang text NOT NULL,
  deskripsi text,
  kategori text,
  lokasi_temuan text,
  image_url text,
  jenis_barang text DEFAULT 'Tak Bertuan'::text,
  nama_pemilik text,
  status_lokasi text DEFAULT 'Dibawa Penemu'::text,
  status_barang text DEFAULT 'Tersedia'::text,
  id_penemu bigint,
  created_at timestamp with time zone DEFAULT now(),
  nim_pengupload text,
  CONSTRAINT items_pkey PRIMARY KEY (id_item)
);
CREATE TABLE public.users (
  id_user bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  username text NOT NULL UNIQUE,
  nama_lengkap text NOT NULL,
  password text NOT NULL,
  role text NOT NULL,
  no_telp text,
  id_fakultas bigint,
  CONSTRAINT users_pkey PRIMARY KEY (id_user),
  CONSTRAINT users_id_fakultas_fkey FOREIGN KEY (id_fakultas) REFERENCES public.fakultas(id_fakultas)
);