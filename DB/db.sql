PGDMP      .                }            gujaratpostgres %   14.13 (Ubuntu 14.13-0ubuntu0.22.04.1)    16.3 g    �           0    0    ENCODING    ENCODING        SET client_encoding = 'UTF8';
                      false            �           0    0 
   STDSTRINGS 
   STDSTRINGS     (   SET standard_conforming_strings = 'on';
                      false            �           0    0 
   SEARCHPATH 
   SEARCHPATH     8   SELECT pg_catalog.set_config('search_path', '', false);
                      false            �           1262    16492    gujaratpostgres    DATABASE     {   CREATE DATABASE gujaratpostgres WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE_PROVIDER = libc LOCALE = 'en_US.UTF-8';
    DROP DATABASE gujaratpostgres;
                gujaratpostgres    false                        2615    2200    public    SCHEMA     2   -- *not* creating schema, since initdb creates it
 2   -- *not* dropping schema, since initdb creates it
                postgres    false            �           0    0    SCHEMA public    ACL     Q   REVOKE USAGE ON SCHEMA public FROM PUBLIC;
GRANT ALL ON SCHEMA public TO PUBLIC;
                   postgres    false    5                        3079    17066    pgcrypto 	   EXTENSION     <   CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;
    DROP EXTENSION pgcrypto;
                   false    5            �           0    0    EXTENSION pgcrypto    COMMENT     <   COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';
                        false    2                       1255    17103 Y   register_user(character varying, character varying, character varying, character varying)    FUNCTION     �  CREATE FUNCTION public.register_user(p_email character varying, p_password character varying, p_username character varying, p_roles character varying DEFAULT 'user'::character varying) RETURNS json
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_existing_user RECORD;
    v_unique_id UUID;
    v_hashed_password VARCHAR;
    v_verification_token VARCHAR;
    v_hashed_token VARCHAR;
    v_token_expiration TIMESTAMP;
    v_created_at TIMESTAMP := NOW();
    v_result JSON;
BEGIN
    -- Trim email, username, and password
    p_email := TRIM(LOWER(p_email));
    p_password := TRIM(p_password);
    p_username := TRIM(LOWER(p_username));
    
    -- Check if email or username already exists
    SELECT * INTO v_existing_user
    FROM users
    WHERE email = p_email OR username = p_username;

    IF v_existing_user IS NOT NULL THEN
        RETURN json_build_object('error', 'Email or username already exists!');
    END IF;

    -- Generate a unique UUID for the user ID
    v_unique_id := uuid_generate_v4();

    -- Hash the password using bcrypt
    v_hashed_password := crypt(p_password, gen_salt('bf'));

    -- Generate a verification token
    v_verification_token := encode(gen_random_bytes(32), 'hex');
    v_hashed_token := encode(digest(v_verification_token, 'sha256'), 'hex');
    
    -- Set token expiration to 1 hour from now
    v_token_expiration := NOW() + INTERVAL '1 hour';

    -- Insert the new user into the users table
    INSERT INTO users (id, email, password, username, roles, emailverified, verificationtoken, tokenexpiration, created_at)
    VALUES (v_unique_id, p_email, v_hashed_password, p_username, p_roles, FALSE, v_hashed_token, v_token_expiration, v_created_at);

    -- Return success response along with user data
    v_result := json_build_object(
        'success', true,
        'message', 'Registration successful! A verification email has been sent.',
        'user', json_build_object(
            'id', v_unique_id,
            'email', p_email,
            'username', p_username
        ),
        'verification_token', v_verification_token -- This token can be used to send in the email.
    );

    RETURN v_result;

EXCEPTION WHEN OTHERS THEN
    -- In case of any error, return the error message
    RETURN json_build_object('error', SQLERRM);
END;
$$;
 �   DROP FUNCTION public.register_user(p_email character varying, p_password character varying, p_username character varying, p_roles character varying);
       public          gujaratpostgres    false    5                       1255    17065 :   validate_reset_token(character varying, character varying)    FUNCTION        CREATE FUNCTION public.validate_reset_token(p_token character varying, p_email character varying) RETURNS TABLE(success boolean, message text)
    LANGUAGE plpgsql
    AS $$
DECLARE
    v_user RECORD;
    v_hashed_token VARCHAR;
    v_current_time TIMESTAMPTZ := NOW();
BEGIN
    -- Check if the email exists in the database
    SELECT resettoken, resettokenexpiration INTO v_user
    FROM users
    WHERE email = p_email;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'Invalid email';
        RETURN;
    END IF;

    -- Hash the incoming token to match the stored hashed token
    v_hashed_token := encode(digest(p_token, 'sha256'), 'hex');

    -- Check if the provided token matches the stored reset token
    IF v_user.resettoken IS NULL OR v_user.resettoken != v_hashed_token THEN
        RETURN QUERY SELECT FALSE, 'Invalid or missing token';
        RETURN;
    END IF;

    -- Check if the token has expired
    IF v_current_time > v_user.resettokenexpiration THEN
        -- Optionally clear the token if it's expired
        UPDATE users
        SET resettoken = NULL, resettokenexpiration = NULL
        WHERE email = p_email;

        RETURN QUERY SELECT FALSE, 'Token expired';
        RETURN;
    END IF;

    -- Token is valid
    RETURN QUERY SELECT TRUE, 'Token is valid';
END;
$$;
 a   DROP FUNCTION public.validate_reset_token(p_token character varying, p_email character varying);
       public          gujaratpostgres    false    5            �            1259    16496    district    TABLE     �   CREATE TABLE public.district (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    is_deleted smallint DEFAULT '0'::smallint,
    gu_name character varying(255)
);
    DROP TABLE public.district;
       public         heap    gujaratpostgres    false    5            �            1259    16502    district_id_seq    SEQUENCE     �   CREATE SEQUENCE public.district_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 &   DROP SEQUENCE public.district_id_seq;
       public          gujaratpostgres    false    5    210            �           0    0    district_id_seq    SEQUENCE OWNED BY     C   ALTER SEQUENCE public.district_id_seq OWNED BY public.district.id;
          public          gujaratpostgres    false    211            �            1259    24816 	   districts    TABLE     �   CREATE TABLE public.districts (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    gu_name character varying(255),
    is_deleted boolean DEFAULT false
);
    DROP TABLE public.districts;
       public         heap    gujaratpostgres    false    5            �            1259    24815    districts_id_seq    SEQUENCE     �   CREATE SEQUENCE public.districts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 '   DROP SEQUENCE public.districts_id_seq;
       public          gujaratpostgres    false    232    5            �           0    0    districts_id_seq    SEQUENCE OWNED BY     E   ALTER SEQUENCE public.districts_id_seq OWNED BY public.districts.id;
          public          gujaratpostgres    false    231            �            1259    16984    folders    TABLE     )  CREATE TABLE public.folders (
    id character varying(16) NOT NULL,
    user_id character varying(16) NOT NULL,
    name character varying(100) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
    DROP TABLE public.folders;
       public         heap    gujaratpostgres    false    5            �            1259    16983    folders_id_seq    SEQUENCE     �   CREATE SEQUENCE public.folders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 %   DROP SEQUENCE public.folders_id_seq;
       public          gujaratpostgres    false    227    5            �           0    0    folders_id_seq    SEQUENCE OWNED BY     A   ALTER SEQUENCE public.folders_id_seq OWNED BY public.folders.id;
          public          gujaratpostgres    false    226            �            1259    16890    gujarat_info_images    TABLE     �   CREATE TABLE public.gujarat_info_images (
    id character varying(5) NOT NULL,
    folder_id character varying(5) NOT NULL,
    image_url text NOT NULL,
    metadata jsonb
);
 '   DROP TABLE public.gujarat_info_images;
       public         heap    gujaratpostgres    false    5            �            1259    16503    images    TABLE     �  CREATE TABLE public.images (
    id character varying(255) NOT NULL,
    title character varying(255),
    url_viewer character varying(255),
    url character varying(255),
    display_url character varying(255),
    size character varying(255),
    "time" character varying(255),
    expiration character varying(255),
    filename character varying(255),
    name character varying(255),
    mime character varying(255),
    extension character varying(255),
    thumb_filename character varying(255),
    thumb_name character varying(255),
    thumb_mime character varying(255),
    thumb_extension character varying(255),
    medium_filename character varying(255),
    medium_name character varying(255),
    medium_mime character varying(255),
    medium_extension character varying(255),
    delete_url character varying(255),
    thumb_url character varying(255),
    medium_url character varying(255)
);
    DROP TABLE public.images;
       public         heap    gujaratpostgres    false    5            �            1259    16508    images_data    TABLE       CREATE TABLE public.images_data (
    id integer NOT NULL,
    label character varying(255) NOT NULL,
    filepath character varying(255) NOT NULL,
    description text,
    is_deleted boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
    DROP TABLE public.images_data;
       public         heap    gujaratpostgres    false    5            �            1259    16515    images_data_id_seq    SEQUENCE     �   CREATE SEQUENCE public.images_data_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 )   DROP SEQUENCE public.images_data_id_seq;
       public          gujaratpostgres    false    5    213            �           0    0    images_data_id_seq    SEQUENCE OWNED BY     I   ALTER SEQUENCE public.images_data_id_seq OWNED BY public.images_data.id;
          public          gujaratpostgres    false    214            �            1259    16516 	   post_data    TABLE     �   CREATE TABLE public.post_data (
    id integer NOT NULL,
    type character varying(50),
    avatar boolean,
    name boolean,
    address boolean,
    text_group boolean,
    details jsonb,
    deleted_at boolean DEFAULT false
);
    DROP TABLE public.post_data;
       public         heap    gujaratpostgres    false    5            �            1259    16522    post_data_id_seq    SEQUENCE     �   CREATE SEQUENCE public.post_data_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 '   DROP SEQUENCE public.post_data_id_seq;
       public          gujaratpostgres    false    5    215            �           0    0    post_data_id_seq    SEQUENCE OWNED BY     E   ALTER SEQUENCE public.post_data_id_seq OWNED BY public.post_data.id;
          public          gujaratpostgres    false    216            �            1259    16523    post_details    TABLE     <  CREATE TABLE public.post_details (
    id character varying(10) NOT NULL,
    deleted boolean NOT NULL,
    h integer NOT NULL,
    w integer NOT NULL,
    title character varying(255) NOT NULL,
    backgroundurl text NOT NULL,
    data jsonb NOT NULL,
    info character varying,
    download_counter integer DEFAULT 0,
    info_show boolean DEFAULT true,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_by character varying,
    published boolean,
    track boolean DEFAULT false
);
     DROP TABLE public.post_details;
       public         heap    gujaratpostgres    false    5            �            1259    16530    post_details_id_seq    SEQUENCE     �   CREATE SEQUENCE public.post_details_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 *   DROP SEQUENCE public.post_details_id_seq;
       public          gujaratpostgres    false    217    5            �           0    0    post_details_id_seq    SEQUENCE OWNED BY     K   ALTER SEQUENCE public.post_details_id_seq OWNED BY public.post_details.id;
          public          gujaratpostgres    false    218            �            1259    17239    roles    TABLE     e   CREATE TABLE public.roles (
    id character(8) NOT NULL,
    name character varying(50) NOT NULL
);
    DROP TABLE public.roles;
       public         heap    gujaratpostgres    false    5            �            1259    16531    taluka    TABLE     �   CREATE TABLE public.taluka (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    district_id integer,
    is_deleted smallint DEFAULT '0'::smallint,
    gu_name character varying(255)
);
    DROP TABLE public.taluka;
       public         heap    gujaratpostgres    false    5            �            1259    16537    taluka_id_seq    SEQUENCE     �   CREATE SEQUENCE public.taluka_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 $   DROP SEQUENCE public.taluka_id_seq;
       public          gujaratpostgres    false    219    5            �           0    0    taluka_id_seq    SEQUENCE OWNED BY     ?   ALTER SEQUENCE public.taluka_id_seq OWNED BY public.taluka.id;
          public          gujaratpostgres    false    220            �            1259    16998    user_images    TABLE     6  CREATE TABLE public.user_images (
    id character varying(16) NOT NULL,
    folder_id character varying(16) NOT NULL,
    image_url text NOT NULL,
    metadata jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);
    DROP TABLE public.user_images;
       public         heap    gujaratpostgres    false    5            �            1259    16997    user_images_id_seq    SEQUENCE     �   CREATE SEQUENCE public.user_images_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 )   DROP SEQUENCE public.user_images_id_seq;
       public          gujaratpostgres    false    229    5            �           0    0    user_images_id_seq    SEQUENCE OWNED BY     I   ALTER SEQUENCE public.user_images_id_seq OWNED BY public.user_images.id;
          public          gujaratpostgres    false    228            �            1259    16538    users    TABLE       CREATE TABLE public.users (
    id character varying(16) NOT NULL,
    username character varying(255) NOT NULL,
    password character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    roles character varying(255) NOT NULL,
    emailverified boolean NOT NULL,
    image character varying(255),
    firstname character varying(255),
    lastname character varying(255),
    mobile character varying(255),
    district_id integer,
    taluka_id integer,
    village_id integer,
    is_deleted boolean DEFAULT false,
    verificationtoken text,
    tokenexpiration timestamp without time zone,
    created_at timestamp with time zone DEFAULT now(),
    resettoken character varying(64),
    resettokenexpiration timestamp with time zone,
    role_id character(8)
);
    DROP TABLE public.users;
       public         heap    gujaratpostgres    false    5            �            1259    16544    users_id_seq    SEQUENCE     �   CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 #   DROP SEQUENCE public.users_id_seq;
       public          gujaratpostgres    false    5    221            �           0    0    users_id_seq    SEQUENCE OWNED BY     =   ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;
          public          gujaratpostgres    false    222            �            1259    16545    village    TABLE     �   CREATE TABLE public.village (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    taluka_id integer,
    district_id integer,
    is_deleted smallint DEFAULT '0'::smallint,
    gu_name character varying(255)
);
    DROP TABLE public.village;
       public         heap    gujaratpostgres    false    5            �            1259    16551    village_id_seq    SEQUENCE     �   CREATE SEQUENCE public.village_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;
 %   DROP SEQUENCE public.village_id_seq;
       public          gujaratpostgres    false    223    5            �           0    0    village_id_seq    SEQUENCE OWNED BY     A   ALTER SEQUENCE public.village_id_seq OWNED BY public.village.id;
          public          gujaratpostgres    false    224            �           2604    16552    district id    DEFAULT     j   ALTER TABLE ONLY public.district ALTER COLUMN id SET DEFAULT nextval('public.district_id_seq'::regclass);
 :   ALTER TABLE public.district ALTER COLUMN id DROP DEFAULT;
       public          gujaratpostgres    false    211    210            �           2604    24819    districts id    DEFAULT     l   ALTER TABLE ONLY public.districts ALTER COLUMN id SET DEFAULT nextval('public.districts_id_seq'::regclass);
 ;   ALTER TABLE public.districts ALTER COLUMN id DROP DEFAULT;
       public          gujaratpostgres    false    232    231    232            �           2604    17018 
   folders id    DEFAULT     h   ALTER TABLE ONLY public.folders ALTER COLUMN id SET DEFAULT nextval('public.folders_id_seq'::regclass);
 9   ALTER TABLE public.folders ALTER COLUMN id DROP DEFAULT;
       public          gujaratpostgres    false    226    227    227            �           2604    16553    images_data id    DEFAULT     p   ALTER TABLE ONLY public.images_data ALTER COLUMN id SET DEFAULT nextval('public.images_data_id_seq'::regclass);
 =   ALTER TABLE public.images_data ALTER COLUMN id DROP DEFAULT;
       public          gujaratpostgres    false    214    213            �           2604    16554    post_data id    DEFAULT     l   ALTER TABLE ONLY public.post_data ALTER COLUMN id SET DEFAULT nextval('public.post_data_id_seq'::regclass);
 ;   ALTER TABLE public.post_data ALTER COLUMN id DROP DEFAULT;
       public          gujaratpostgres    false    216    215            �           2604    16555    post_details id    DEFAULT     r   ALTER TABLE ONLY public.post_details ALTER COLUMN id SET DEFAULT nextval('public.post_details_id_seq'::regclass);
 >   ALTER TABLE public.post_details ALTER COLUMN id DROP DEFAULT;
       public          gujaratpostgres    false    218    217            �           2604    16556 	   taluka id    DEFAULT     f   ALTER TABLE ONLY public.taluka ALTER COLUMN id SET DEFAULT nextval('public.taluka_id_seq'::regclass);
 8   ALTER TABLE public.taluka ALTER COLUMN id DROP DEFAULT;
       public          gujaratpostgres    false    220    219            �           2604    17045    user_images id    DEFAULT     p   ALTER TABLE ONLY public.user_images ALTER COLUMN id SET DEFAULT nextval('public.user_images_id_seq'::regclass);
 =   ALTER TABLE public.user_images ALTER COLUMN id DROP DEFAULT;
       public          gujaratpostgres    false    229    228    229            �           2604    16931    users id    DEFAULT     d   ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);
 7   ALTER TABLE public.users ALTER COLUMN id DROP DEFAULT;
       public          gujaratpostgres    false    222    221            �           2604    16558 
   village id    DEFAULT     h   ALTER TABLE ONLY public.village ALTER COLUMN id SET DEFAULT nextval('public.village_id_seq'::regclass);
 9   ALTER TABLE public.village ALTER COLUMN id DROP DEFAULT;
       public          gujaratpostgres    false    224    223            �          0    16496    district 
   TABLE DATA                 public          gujaratpostgres    false    210   ;�       �          0    24816 	   districts 
   TABLE DATA                 public          gujaratpostgres    false    232   .�       �          0    16984    folders 
   TABLE DATA                 public          gujaratpostgres    false    227   �       �          0    16890    gujarat_info_images 
   TABLE DATA                 public          gujaratpostgres    false    225   ��       �          0    16503    images 
   TABLE DATA                 public          gujaratpostgres    false    212   Ď       �          0    16508    images_data 
   TABLE DATA                 public          gujaratpostgres    false    213   ��       �          0    16516 	   post_data 
   TABLE DATA                 public          gujaratpostgres    false    215   ��       �          0    16523    post_details 
   TABLE DATA                 public          gujaratpostgres    false    217   *�       �          0    17239    roles 
   TABLE DATA                 public          gujaratpostgres    false    230   ��       �          0    16531    taluka 
   TABLE DATA                 public          gujaratpostgres    false    219   K�       �          0    16998    user_images 
   TABLE DATA                 public          gujaratpostgres    false    229   ��       �          0    16538    users 
   TABLE DATA                 public          gujaratpostgres    false    221   6�       �          0    16545    village 
   TABLE DATA                 public          gujaratpostgres    false    223   ��       �           0    0    district_id_seq    SEQUENCE SET     >   SELECT pg_catalog.setval('public.district_id_seq', 35, true);
          public          gujaratpostgres    false    211            �           0    0    districts_id_seq    SEQUENCE SET     ?   SELECT pg_catalog.setval('public.districts_id_seq', 1, false);
          public          gujaratpostgres    false    231            �           0    0    folders_id_seq    SEQUENCE SET     =   SELECT pg_catalog.setval('public.folders_id_seq', 1, false);
          public          gujaratpostgres    false    226            �           0    0    images_data_id_seq    SEQUENCE SET     A   SELECT pg_catalog.setval('public.images_data_id_seq', 1, false);
          public          gujaratpostgres    false    214            �           0    0    post_data_id_seq    SEQUENCE SET     ?   SELECT pg_catalog.setval('public.post_data_id_seq', 20, true);
          public          gujaratpostgres    false    216            �           0    0    post_details_id_seq    SEQUENCE SET     A   SELECT pg_catalog.setval('public.post_details_id_seq', 9, true);
          public          gujaratpostgres    false    218            �           0    0    taluka_id_seq    SEQUENCE SET     =   SELECT pg_catalog.setval('public.taluka_id_seq', 251, true);
          public          gujaratpostgres    false    220            �           0    0    user_images_id_seq    SEQUENCE SET     A   SELECT pg_catalog.setval('public.user_images_id_seq', 1, false);
          public          gujaratpostgres    false    228            �           0    0    users_id_seq    SEQUENCE SET     ;   SELECT pg_catalog.setval('public.users_id_seq', 40, true);
          public          gujaratpostgres    false    222            �           0    0    village_id_seq    SEQUENCE SET     ?   SELECT pg_catalog.setval('public.village_id_seq', 1290, true);
          public          gujaratpostgres    false    224                        2606    16560    district district_pkey 
   CONSTRAINT     T   ALTER TABLE ONLY public.district
    ADD CONSTRAINT district_pkey PRIMARY KEY (id);
 @   ALTER TABLE ONLY public.district DROP CONSTRAINT district_pkey;
       public            gujaratpostgres    false    210                       2606    24824    districts districts_pkey 
   CONSTRAINT     V   ALTER TABLE ONLY public.districts
    ADD CONSTRAINT districts_pkey PRIMARY KEY (id);
 B   ALTER TABLE ONLY public.districts DROP CONSTRAINT districts_pkey;
       public            gujaratpostgres    false    232                       2606    17020    folders folders_pkey 
   CONSTRAINT     R   ALTER TABLE ONLY public.folders
    ADD CONSTRAINT folders_pkey PRIMARY KEY (id);
 >   ALTER TABLE ONLY public.folders DROP CONSTRAINT folders_pkey;
       public            gujaratpostgres    false    227                       2606    16896 ,   gujarat_info_images gujarat_info_images_pkey 
   CONSTRAINT     j   ALTER TABLE ONLY public.gujarat_info_images
    ADD CONSTRAINT gujarat_info_images_pkey PRIMARY KEY (id);
 V   ALTER TABLE ONLY public.gujarat_info_images DROP CONSTRAINT gujarat_info_images_pkey;
       public            gujaratpostgres    false    225                       2606    16562    images_data images_data_pkey 
   CONSTRAINT     Z   ALTER TABLE ONLY public.images_data
    ADD CONSTRAINT images_data_pkey PRIMARY KEY (id);
 F   ALTER TABLE ONLY public.images_data DROP CONSTRAINT images_data_pkey;
       public            gujaratpostgres    false    213                       2606    16564    images images_pkey 
   CONSTRAINT     P   ALTER TABLE ONLY public.images
    ADD CONSTRAINT images_pkey PRIMARY KEY (id);
 <   ALTER TABLE ONLY public.images DROP CONSTRAINT images_pkey;
       public            gujaratpostgres    false    212                       2606    16566    post_data post_data_pkey 
   CONSTRAINT     V   ALTER TABLE ONLY public.post_data
    ADD CONSTRAINT post_data_pkey PRIMARY KEY (id);
 B   ALTER TABLE ONLY public.post_data DROP CONSTRAINT post_data_pkey;
       public            gujaratpostgres    false    215                       2606    16568    post_details post_details_pkey 
   CONSTRAINT     \   ALTER TABLE ONLY public.post_details
    ADD CONSTRAINT post_details_pkey PRIMARY KEY (id);
 H   ALTER TABLE ONLY public.post_details DROP CONSTRAINT post_details_pkey;
       public            gujaratpostgres    false    217                       2606    17245    roles roles_name_key 
   CONSTRAINT     O   ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_name_key UNIQUE (name);
 >   ALTER TABLE ONLY public.roles DROP CONSTRAINT roles_name_key;
       public            gujaratpostgres    false    230                       2606    17243    roles roles_pkey 
   CONSTRAINT     N   ALTER TABLE ONLY public.roles
    ADD CONSTRAINT roles_pkey PRIMARY KEY (id);
 :   ALTER TABLE ONLY public.roles DROP CONSTRAINT roles_pkey;
       public            gujaratpostgres    false    230            
           2606    16570    taluka taluka_pkey 
   CONSTRAINT     P   ALTER TABLE ONLY public.taluka
    ADD CONSTRAINT taluka_pkey PRIMARY KEY (id);
 <   ALTER TABLE ONLY public.taluka DROP CONSTRAINT taluka_pkey;
       public            gujaratpostgres    false    219                       2606    17047    user_images user_images_pkey 
   CONSTRAINT     Z   ALTER TABLE ONLY public.user_images
    ADD CONSTRAINT user_images_pkey PRIMARY KEY (id);
 F   ALTER TABLE ONLY public.user_images DROP CONSTRAINT user_images_pkey;
       public            gujaratpostgres    false    229                       2606    16933    users users_pkey 
   CONSTRAINT     N   ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);
 :   ALTER TABLE ONLY public.users DROP CONSTRAINT users_pkey;
       public            gujaratpostgres    false    221                       2606    16574    village village_pkey 
   CONSTRAINT     R   ALTER TABLE ONLY public.village
    ADD CONSTRAINT village_pkey PRIMARY KEY (id);
 >   ALTER TABLE ONLY public.village DROP CONSTRAINT village_pkey;
       public            gujaratpostgres    false    223                       1259    17013    idx_folder_user    INDEX     F   CREATE INDEX idx_folder_user ON public.folders USING btree (user_id);
 #   DROP INDEX public.idx_folder_user;
       public            gujaratpostgres    false    227                       1259    17039    idx_user_image_folder    INDEX     R   CREATE INDEX idx_user_image_folder ON public.user_images USING btree (folder_id);
 )   DROP INDEX public.idx_user_image_folder;
       public            gujaratpostgres    false    229                       1259    16575    idx_users_district_id    INDEX     N   CREATE INDEX idx_users_district_id ON public.users USING btree (district_id);
 )   DROP INDEX public.idx_users_district_id;
       public            gujaratpostgres    false    221                       1259    16576    idx_users_taluka_id    INDEX     J   CREATE INDEX idx_users_taluka_id ON public.users USING btree (taluka_id);
 '   DROP INDEX public.idx_users_taluka_id;
       public            gujaratpostgres    false    221                       1259    16577    idx_users_village_id    INDEX     L   CREATE INDEX idx_users_village_id ON public.users USING btree (village_id);
 (   DROP INDEX public.idx_users_village_id;
       public            gujaratpostgres    false    221                        2606    17109    post_details fk_created_by    FK CONSTRAINT     �   ALTER TABLE ONLY public.post_details
    ADD CONSTRAINT fk_created_by FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE CASCADE;
 D   ALTER TABLE ONLY public.post_details DROP CONSTRAINT fk_created_by;
       public          gujaratpostgres    false    221    3343    217            &           2606    17104    folders folders_user_id_fkey    FK CONSTRAINT     {   ALTER TABLE ONLY public.folders
    ADD CONSTRAINT folders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);
 F   ALTER TABLE ONLY public.folders DROP CONSTRAINT folders_user_id_fkey;
       public          gujaratpostgres    false    227    3343    221            !           2606    16578    taluka taluka_fk_district_id    FK CONSTRAINT     �   ALTER TABLE ONLY public.taluka
    ADD CONSTRAINT taluka_fk_district_id FOREIGN KEY (district_id) REFERENCES public.district(id);
 F   ALTER TABLE ONLY public.taluka DROP CONSTRAINT taluka_fk_district_id;
       public          gujaratpostgres    false    210    3328    219            '           2606    17040 &   user_images user_images_folder_id_fkey    FK CONSTRAINT     �   ALTER TABLE ONLY public.user_images
    ADD CONSTRAINT user_images_folder_id_fkey FOREIGN KEY (folder_id) REFERENCES public.folders(id) ON DELETE CASCADE;
 P   ALTER TABLE ONLY public.user_images DROP CONSTRAINT user_images_folder_id_fkey;
       public          gujaratpostgres    false    3349    227    229            "           2606    16583    users users_district_fk    FK CONSTRAINT     }   ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_district_fk FOREIGN KEY (district_id) REFERENCES public.district(id);
 A   ALTER TABLE ONLY public.users DROP CONSTRAINT users_district_fk;
       public          gujaratpostgres    false    210    3328    221            #           2606    17246    users users_role_id_fkey    FK CONSTRAINT     w   ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.roles(id);
 B   ALTER TABLE ONLY public.users DROP CONSTRAINT users_role_id_fkey;
       public          gujaratpostgres    false    230    3357    221            $           2606    16588    village village_fk_district_id    FK CONSTRAINT     �   ALTER TABLE ONLY public.village
    ADD CONSTRAINT village_fk_district_id FOREIGN KEY (district_id) REFERENCES public.district(id);
 H   ALTER TABLE ONLY public.village DROP CONSTRAINT village_fk_district_id;
       public          gujaratpostgres    false    3328    223    210            %           2606    16593    village village_fk_taluka_id    FK CONSTRAINT     ~   ALTER TABLE ONLY public.village
    ADD CONSTRAINT village_fk_taluka_id FOREIGN KEY (taluka_id) REFERENCES public.taluka(id);
 F   ALTER TABLE ONLY public.village DROP CONSTRAINT village_fk_taluka_id;
       public          gujaratpostgres    false    3338    223    219            �   �  x����N�@��<�o�T5����Р
h)"��$�X��F'��H��*G	���F@R��W�G��;��^�Ē������^\�,9+��^�\�+�<�I�9��w[�E��ܫg:/���?=�<ǟZh5��V�=h���駯�VL��HX
#�Rڥ|��V�Z�L99z��Hr�<���2��@G��Ճ#��|���p�U���"�S�r�#b$*p��Z]k���m~z������֗N1������4���-<���6F���߀���;f�ױ�f���,�7�i�!���nCk�$@f+x;�M2�����p� �dl� �(��V8��6#B�D�H�4ڹ)c>E��>��Q2�s��H�"�A>�6F]�>����O���m:	���o���bSVO�$w�'���=��ih}%�&|��{茤�h0E���*�'K=cڵua.E��ʚ���ꐮ="�}�I�y"SI�O���1�����d�_'c��y���$�5)�U���ґ��
��yS�-��%O���7^���X�b/ܗAE�A@-�X���6S�7�HڊB(2	�c�;�<���u�u�t��鵹��E�sn<@٬����|�cȡvRF7	��1#�}� �l_�I�m��,��ѣ.�!��˹�B�͆��"*b��19��ujJ!7�M����A:��25_�E���#
�7r76c��B�3�֘��o��u	45��)w      �   �  x����OQ���{C1n���b�-ܧ��[iw��m�"	c8b!Q�y�!iR.���?ř�}�x�=/M��g���N��Zei��-�U_x;�Z3���$�a=M��ҳ���w���7�������A��Z���zͤq���������D�y�;m�Q�'TO��H�������ҺJ�OC�U�V��Jtua�s��V=��5���� �� o i�\`�̮�l��������ق�3y�"�Vw`ԝ�-tA���V!JE�x�V�#�����}D��?�v�;[�s��!)o�FH�����b[z��Kwȝ8������8�*\��r��ۖ�SZV�5%���Cg��OK�Zm���]���,%n�MBa���=����H��E���0m��=m٪h��~��:������E4'�E�>�q#�W���|d����!C/���Gٮ���H$�֬"��$ É���ݵ&.d��f(չ�Dh�Pu��yD� ㎭E��(I�@����Ϣ��+F^��Js���8�����"_}LvhN�$�ZIl���uj�u��BV�ca^L�fm���q�ѩ�8n�^��m0\J򈖛6���3}�o'�k� �Mb<�y��d'���yF6c
�U�SkS�֙�bƧ�t(��qc����.б��N�O�LQ���R��8�?@�$��-	��5����0����>]�RK6��>4/���>3�>�w�      �   |  x���Qo�0���~c�Fd�Ύ�{Z)AmVX�GHIa	��K�IˤF�������-G�����E���Ym�,	��ܧř��r��Y���g0����%j��7I���m��
W���%�� �ĉ��b�Pu`�(z��ϣh���]����(�
ŷ���Z����#�	m-��VF�Ё���kٴJ�h�:�hP�ڽˎl���;3c=v@��{҂M����]&�}�6{w|vy�7MM8Ld�$�\Z�@՛��eW�v��ܹ�..?��EL
��
� ��:�d^����d��wW6+�K�����h,��:��{{R�6��)8�!�d����#h�:С*�����î8UG��	iAX�)H�T�UF���k�      �   
   x���          �   �  x��YIW�J��W�K�9-T�н
v�c��`�j����׿�X �R�8�4}��L��u뻳������h����_[�K=:3�gcu�[��㏝��G��w� ����~��5I��x��I�}8O>6�Q���/��d1���Np�\��N�3���4ͩx�����=�s�%��{�|v�rM�����Ǵ@%�런 �p��|�LSeb��M�g��#�7wT<R���X#����3G���`�pP��{3�k�?������u��۽;�c��M��2A �����O�`�HDZ�<�H*�7�@c�E�E���/�i88 ��N��R��?�L���GH	%��#�H
�C��1/�hp�1򥌌�z�CA qƤ4�z��@{������D~;�P���,r�O��i����t��pR���8�3�,����L�Rs��_��B��y�۳I��W1�,�*8��!��k��ŷ�[C*#����V+�Y��9G�t	 ��������,�|�|�;��^�v��ݱǓ��r�lB#���+�G��n{��>*(ͫ���^3"�F�f�"¯�<KQ���ђ�z�8W)��n!�0b���h!t��T(���9��O�N����"r��\��Fw|޹�? Jm�=~�O�Q������\�(�?5�����\�X*��3Z2� �b+�%��� i��xs2+:��j�z�ٌ��#����\%Hk]Kz���h� ��<�I
�hʯ�J���8�!f�BEB�C�ǡ������٬�y�Z����������v'{ד*���j���8�y� E�d@9+�[-�k�R�0���X��(���⼣��(Exs6�y�`1�w;�;ţˡZ$z�n�09�p�|U;��+q#��i(���ͮ|g?����~�cOk�R"<�"��za U���I4����>ۻD��ad�p����=��5�nlT�
{���˧5G��L��sI����,�GD����u 3��đF�E
?_�~9(�U�)	�֌yHN���\ �$�^F����Y���a���'7�=�������\<P�0A.�&��eD"���q"B3DEϳ�?���(NV� ��hk�Ҋ�a�p -F�/�L���9��<OE���r�3/gj���.'U8~v۹�o��^jg{`�m�)B�9���H�����VF���qrR�c:�7D �%�:4�y��8�8�2�f�U���6f��o�E)�&�w�b9��.��:�ouj6�^M�Սv= �� Đ���"8D@�ח�b��:��+�s��@z��ԅ���Jc��J��l��_��j�3[�
vtp��=9]ΝKj6[%�l�X�JN�#�&�V��t:I��YN�TJ&��$��`2�iߘ�n��a�OjM�ScO��Z&('�%-�k�����ToNn�1�[��1�B��TQI<
߅��0�K����"�Zf�g����}4�"$��	�L�^�*']l
�o�M���Һ���-�W��0�ryFr�)(r�xM��
��:�^!���H�P����)�_��/A~��i|��~{�춐�+�qu͐�'U�[4����<�-P��X�#A,�T�m�x���T@K	�LҰ	)�-��*��Ri��~ޜ�j��������b ��{`��+�I�C���G�ŰF��p�"�(L2��Ann,�?56�^'*�C@��S��V� ��
���xs&��߽�TS��      �   
   x���          �   h  x��Vko�6��_!h@��ħ(u0��R�y4���A�iɒ#K�D�q���������B�������ɫs9:>�?�0F�'F���������Kn��^�?B�k���ή!�E��F<������z�ތ�D�5̥"*�S��o�f��P�nUĈ��\������U��7j@i�L2���LuV��y9	K���������y�Y&�k���}��۬��è����H�h2 �x��v�����C�޴^�g�\�R�⽙H��Sa���T5i��m�Y��&�L�%�L����.���i��Aͷ�R��I�d<�E�VS �猎,�P�] �۳bj>�4d�����Y���2ڔ����E~�(ŤA�c�+���|Jw���>}DI�T�hG�ܯA�ڿ(|5(a
[���Pb�R%�d����'�ZȎ2nGc1��,�΍#�oc��r����� 1F� ����Q�)bȣ�O��` ����J=Q�`RIK����ڥAլ�o;�D ��A�n1�A�չ*��hT�F�^�zU�fy�!y���y,z{�ܱ�b�'���0��u_,{?n;�{��~4�"e���$&����^� ��E�������(�n/W�N���`�����`�W�z��ش��~#�i'�p�.>W\[%r�Z��uJ��)A���N�QO�S[�.:����G#@J� ��]d��@s�lZ�N��F���,�����oi�-�j��g��W-�uc4C�/�}���j���]���������[���:�a}od�Ẵ������k�<.�M�{���^�ӳ�;g�++��A��X<�X�2_f�(�$�:�WṶ���\'+ɧ%�[ow�� ط�鱶�V[[ 6%�C      �      x��}�rǕ�=E��C31@"���ՖƖe],�w7�F� 	$ ^ǎ�8!�Z�B�� 9As��%Hb@dP��C�
b�`aOfVf]���4�n� 	Bߪ�����w>����>�,���~��>;�0�B��VV7�^m�/�$�~�矿�i��o�'KK'V��7'����J{"!�b�-1�~sg���敝���ͧ;����|�s�r����s�
��|�s�۝͛;�O�+�/v6�v6�?6�7�qޑ�܇�����G�ux��]�����[����;�{
�~��͹���+���y4?=�ZKS��O�Z!So�-�h.L~�<�N�>n��_����҅�̱F��|�������6<��c��
�<{�&D�e�h���ϕ��i��c����B�<��<|~�=�^\m/�疗V���}8�������J{ue�=�2�r�����K͙��S�<��^Z�i/����d���_��~�W���Y��gj~z��j�--����g���V���//�n/�ηW�u��/����Y��޴��t�]�_a��=����V�W��v6�v����������r�<qO� �������=3�ڜv������c��L��EW&,�����g-R�m�?o�C�sM��?�/as�M涞{�E�Vӥi�En���;����fk~՝��f�&���S�hviq��Ջ~/�U�`����;�7ea~���C�������W����L�����Ls�i�ž�g���s�҈ۗ���Zl���>5?3㷡}��9��y���g���jU��bz��-���Ό���Cz��fgۭU��/���lS����{v5]��<��a�U��rsf��}����řL��]=3�W2��d�q�܄������w�W���B{��S����<�l�<��t6�=٩��?�x
����J;����l���2��|��gq	��'�%U%v���,\��M��A?�@���ڹw���)�������U��x ��Ϸ��Mb���G�����q���J�}�V���*{�^��w6�}���3�ҋ��^�?I�$�to�ww��#��ߘ��5g��l�hu�W4?��o[�S����9y��v��;�/����f�d�o�=���{�~�D��g��5�f^���^M:�0Ք��l^�ￚ�w8�u���Nn8�z��l���NO�_�;������邺s=��?��~�s��Mo��A^�m��{�"=����&O�������r�������"���Mw��f��o��� �������W��r�v.�?���oQ�ZN8�e��H+�1_L��xM���z���� \����"�&ŔOb1I(�aJFk������ &1��&�5mP�_����^o3cf��M3-�0�7á�B���{�~�oN_��Z��;���ԩ��n�ףD����.�d�V�~p�{�����M������'���֩����x�:��/~:iWs"'�xc�rP����@I�W���Gu��r�2�>�ؠF#�ȡ!��<	�f���^�g�������E2u���>���|��Lk�Ɏ�ϔ�uAm_�nm�U�I4�����ͽ��o���G�k��K-��ԩ�Oz�O�p�D���UoT�5������\�&�|է����{o�%r��	�ӽ�5>��)�<�d�Sz`�V�;��� ��v\���1������vp��[�񵗪�����|��l�t��Q�0O��g�n��x/��$D40ov@��ܬZ\!���s��ڠ	�s�s|0��<,�$���E%����τƗr��B,��� �*6*xPl��CRl�E��b�SFo����^�|`9�x�IBL�6��[LB<�͙���s:'؋���ԯ�U?p���L^_=
^�e§0���������{�����}8u���
[je��|��N��E9US.&�H!5Q��� q���J (gn�/_H���ŀl��1LH6�Gfǌ�9s�:�\���Vk���R�!��\-�o�e���mz,�u���V@b9��c� �F��.]q��Y�V���h�)4�b"��RHc!%,�OFO��!5��q�CP�.2�P���Z5w�Fh��¡�J!3�0�ƕ
RH42�b�@�ٗˠk��L�A'#j����̐��1�Z�G�s��#&j�E�Y�
����9{�[�e+x�Zե�S���OϞ E�:ߗ�s�Yi�F���]��H;G)���soӔ4GZJCh5L�
����i^�xI R�&��_N+��&���.�,JH��hr�>d��tny��\sqf!S��ȣ5��Ӣ )���đ;�1H�e�p�G���4!}�z���H�18�RqԌ"�4�F+ Dq�x�+��.�w=	�/��/��U�9;��a'2���2x��#et�1���=��|�����|��:ڇ@%�|���@��#1�`���DE V7�n}@�����؅|�Ɇ^c ��\>�Gg�]P�� "\�5��`%nL$���ή��'�1�"���a�x�q�������6c����!Qôa�b�b$-�e	GFQɹ�I��lpx��W��t+U�]�JL#6�W¹g�E�*-L! 7�XN83�JR��"f�3N$Sڢ�9�b��
9BK�c�?�-&���zL�w� �޷;�&��R
�u����X0�����Q*�8�`��N��Hdc�Jrf8܃ ��
-@>��1x�)bX:���L�@��@�!J}��o+�%�>�"lzB����o|��|����?��f�� K�'�6�lP�n�WX�����8�|�y����x��@.d�r��6�+�R{��B.��ǎk9�(ԓ>��7�I��v��ݯ��_|^U&��� V"���(�� '�2��!�P�s�ҝ��j��I�YQQ��vG��*���pŌH	�
�ejS� ���rX���=��hs�E`ۦ�hO`E�ͣ�t�U�ǐ�`��!���~!�d(�D�����_��*"�&����� ��33J$�rA��>恕�E��t�j0�=/]�d�q��������BZ0���̃�	�)l�	���D3�N潺^h�E;v�l^V	�%,R�ܳ��ٵW*�3�Ӱyڋ��{2am���AJjNqyi��)��;{B��E�swqO�����)�I����!\ 0�R�4�%��pf��k��De�+�(���gO6��N�౐�(C��x5&�$�x�KkI%[���t�u���jĴ���I"�*L"	F\A�4� �f9Q6��9 ��y��.ɔ�*ˇ����	��
�܉�z���Q����h����
¹�b�s�g�L�5Ε\�Β�t ��ޮ���E�ع�ua�xI�~#:�u�,ZM������!��`=1'L��w`7� �h����W�,]�@���K=R-v�؍�إBVm�z�R�	��p-H��1��`䈊�%t��F��($�|�j��^������,fi����:Z;f�8TY��>��r$��%�XE;��*�SNձ�W�^��ACS��������x��lr��k�S'���Z6�^6S��O*)6Hr����a#�ԉ�H3,�tJx`�C�]�𑃠� �Q�Ո�7v/�/P�4v��۹�p���^�0�*�G]����_��wH������c	E���|���5o+��m��dܗ6�7�M�K���;�I���������C�iÚ�"7!�D&�4��KUh$o0� ��
#	��4eS��LK����i�p��W�J��ߑ*�ڴH����_��sʬ{�Q������q<��U�VSM��g+�o>|��l��7�M�2��ͣ� "5�%W�����t�S�I&�c��k�4f�}�h�hE�րb.��Ƅn���b���^�RY���v`8�[G����Q�� aW}���j��Z�zD����>tQ��2G�ˍ ]%�t���G�'���낟,�a��9RnG����Ӵt�� �w6�����,Л�'�i���?�� /����OS������@�E��HR�sd^�t_���I��k�d�<�	*e    gc��!h��p��{��AQ�.\�R�g�vP��o�*S���M���/w��sw�Tr���/�5�}g���>z�ӾgN-3S�H�w\[߃!��ɻ��(؎?<6��*)sJFg��g�N����.!�k{���1��4hL]��oWwL��72��1�!�uJ�y�?�}���!G��t�'O|�y4)�hd���P����,�g�����0���gj�-x8�}�-Ϧ������hY���u��t�_��l�w��wj8����'�?�$b0�3��9cY�7F���(E4���i9aD��1NJ�I�gkRv��iM*ÄA:��i�#"�$�G����\+�^��$AX�a'�]��w���k9x��DfOk��..�M�2	�a/i��!l��DIō��M�+p����1�bI$D�k��JK�%����=���U��k�^J{����_΋OY����ZL6|�cy����Y=����8���'E�3��6]b��J�_|��h^�%�si�m�a�A)�ȉ��u~���~��-X�+�����g���_5�n��bٞ��g�B>w"��!$�X�9�����]��6,"�:����ϱ!q
�0CZ��H��HQ&�}������.�=��ǒ��8f��r��9S���1�%��Zs��%¶�+j�V���lp���p�0�J�moNM�S����Jn�B^�x���h#���pI|��],��|½bI�Y���8{�u�RG��T)�J%~�`���8��6O��ԛ�_�ze咽b����!L�p1������s-Q�2,0ņ�g���3e�`0�|���x%���	FV���5�i�5Qވ��̥LG��QƑEWK�a����F�	,��Z����Lm�k�>^��Z�@���S�����#Pv?L@޲!�yA�eA�4��A�C���Z����p�Io��-�=��!B﷛KK��s�����N­*�(ܢZJGMJ�*]S%�VHI���ZR� �Km�qƍ�ȡ��{��Ue0c��1�c�r�m��s:s�=21U��������˜�	&��
��,`h�E�IA8a,��aY����0w�2�X]�Y��HTa~ў^�_mW
U�=<�iˎtE&I&�6�(���IL��4>�:�9u�$^Xi.uĖ�~3SC�r�P�嚒:�ffΞ:u�Pk����������;� �H�C� Q@�o̙"�cR!���
+f�.$�!v7�����q̽�xHG��������L
~	�d҆����ܱ*8�	�(eA>���c�Si&Q�a;AZb�7����u9�
FžУ>P���+�cv_�'�-*^�T��W<'�1/Vp*�,v�,��H����8�6g�a���Lt-���v�D1M~'�p�}�ڮ=�\){�d|:�F|xy�����["�qńc�Bl�P�%�����#0�GWg�@�����qo�l���ױ_��'���/�H�@���Ō������U[��(��_�L'��2�	��?�9z鋹2��P�f��u_����;�����Ү��2��u�q�|ok��\z6zw��QoU0;=�fkUP��QW=(<:�\,p�8�_�����+p�ƌ�~nmt�/���-A^¯����g��ki{�M(.�gŌZPd�ĘcKJ,�[*M�n�F�.�h{{����Z�j�{��`!�2Fō!9FF����
ьi�y��ɿJ�a�����.�	:��ٿp₌�h����y����2[c�V}��r��(�q��O��<a�\�l=�j��{�#��5I�c����@A@SH�t�v���P�ޘ����9$H\��(ごK�|���EU�����Y��0� ���
@�e�qmS����^a�&+F	�����(�W����%�6����zR��w�o����s�6�T�ު�JJ�5�&7(k�_q��=Hm���������rGm�H���Y[S*��<5O�գVC���Ϋ�׼VCɈ�Y%C�3���������`u�H��PYF��WWva�4���WK��K�p�.!�ah�ecc�Wqp�5SBc,�����.jUP���JH)ͪ��rm����F�]s��f`e}Dw8)�]��k	�%t$�gh�a����&��I]C��%�V�����S�jo��7m���l�����E
¡��]�;z��\>�Ud���7㤫+)�����"��5 ��ŧ���x���|�7ܔ�{^�W�q�]v񓏧>m/�η'ߟ_l.L�~����02�Y)G�6o�޲l&0����x�N���d���p�wFQ������3����;Y.� ��X���{�;aY��ӆ.w'gO�_��x���?W���[_:�4�ٌf+C��;蚔��K���̸�����:���N��{����5�zMQ����_�[^�B��+��t�ޗ���������p���.{��J�����J��w]o���x��?{�۩fΝ���|1�����I�]��E�nXF}Ƹ@�	*���)�<��Q�mQ<�q��,�9�nq���x�����R{����Ld�PΑ�B͘�F�����]XXJ�9�]����Eǎ"� �1cn��;A�4�+%�+�3�&�@���ݡ�aZ�JJ^}i�~��yb����.u���h�b��ta�Cn"V2a���P�n���y�^�������T�1��O�Ƞ]r%c~���u��w|��jN���H��F#��\ɍ�2R 	��zg�7�Ҥ�p:P�ǿZ=���So�������w��;��.�|W�ɕv��{��t
�^<"'��0���+v���>V���;�l?ΑW��(۱�;.�r3��g~bEl�!n���_��Z�TCI���������W�q�N?�Ѡ�f�ݞ���z�SGΝp����S4��~e@�a��g&ϥ�d-�i�M`%O�Lc���p��6�������'N?~Fҙ]Cc��Pe7t<��?[yo�j�81P7ǒpm�dXp���Y� 0Gg(��4�.��;�bm�G���o�x_�F�PM)*�ќ����"=�r@Rrn� ����`�gY�����/ʓUpp���8^�P
��d�j�c%��a�PČ£6�����o�ܷ��5
���q%> F�"g04�4i�M:�m1\Dڧ�#�����#C�Y���4��>D���Xj�l������,�ǲ�k���<J룲#uM$��-7W־1n���NҪ��rҡ��	�(�l��F��w�Y�'�Ϋ.&�n=��~�ϧK�BI�p-� 7'���s�S�U���l��>���j�)���S:"2y������8}�훧��گ�B[�3��������;��Uv�1����$)�F`&WY�ۙ(6=�q���뭱먗
��w�='�Y:t���.):�t�")��\`j2S@�1F�e�'�� �h"�a�T�#�]�L�ޠ��HoS�;!��L�� ����yL�s���A���@>��$_pq{��l|�#Jv�Y������Z���[u/��~븓@���ǜ�� ��$q�x��w\���JmAÿE���(7�6�ɽ�w9�w��\�i�����'�p�zāq�%��;�rv�U��jZ�&��k�v׻��;^K:�7 Ew�t}����p#tه���E��#k���_�_�Ҥ[�p�񌟅=��p��6�zܛ��M=��n��r�P�z�$N��}��1/�����{��_y��wK�"Xr��|����J�Xby��$�L�%�b���u�W�O_��ĭJ
��m��\��Aӭ�Qn���r�l�bp6�y4Qq"~s��k�6����������~�n��,��\ ?�9�_Nr��8)�Uq�v��W��g��\t�i\��.'��Q�+ޜ����9Z��9M߇�#;��J����������ۿ��|���n��.o�{�m��u�J�\�LPo�b|߲��r�$�_F���=���Jh���ՊՊٖ�kn���_��N�^�HB�ߕx-�uL͑�wC��    E(NK�ҍ�UhJ
��`�l�����?2I�MGp��cH(Nl��h`Rz�8T���i
��#Lq��.!i.��3��bG���fg�E����v��.G(=�m���J������yfe�TUd�����e+d��{3�[���=�U������)#�D��{B9C敊rmp��eQ;�Sq������-�������TaX������(��/ڿ����Ü?���G/�s{�i��m9`���~�[�{1Ĳ���A���
l�DN��Jd�*�IV9�)�O^�LCT���S|���$�ߴ�x�p^"�~���'�*�1à4R�kM��LĦ6m(�\a˴h��;R�x�����!k�571�g�c�� p?φ����]���ޣM:�L��^ܫ�{���K�������Ea��T�]�9Gy�_{q����������~�$)�6 ͥq�v�jU�M�We��u�0����{�F[>�||qz�d��+�m8������#t�7�p�.zc�����I5����d�<׆HČm�+0��Q֦*�$�8���q��W�Qv,��^1K�
1Ba%Q�g��Fp�(�Tje"�b�}eR��IJ���X���6+���_iL�RDQ��n��"|���,:_���'� ��IQ-�������ЀCh�>�3�� 9�ж_u"Ć � 8�Ķe�IÇ�5�Vk�HjC���DR"C� 6�cV��j|����Mߗ�iH7..�~f#O�2�s��n�I4��r��4�U�,�.>��t�K��_���K��MM9��"7�t��^Į�jKQ!d���k"�ⅅ����&f"�b3�[�r�(�L���l��A���|��A�D[�V�M�	��7~�Ra�,:(�W����र���3G�A���8�͔��h[MF�d�5G�PJ	�"zxT��t�u*�Cg�:�@�$�1J0��1	��j�H�������;�n,7�f�]Pkf����Z��@����-�k�'����:E��
��Q��H��n��җ�M��1W����(+��s'HEs��+{�������f,>���k�@m36'�#j=�����#�G>�������/��L˼�T� :q�����;5@��]v�;:2_ �i��5�����ݾ�ڗ޿��M����%[o䊒~t�|�Va�U���-��uT/�ꃛ�e[�qe�����J�{Vv)2�������ٟ?��!����݉�"���n=�,�E�_ǂ�?�Zԫ���ѥ�x��������0J��10 ^9��r��9u>�]IX�ep��Y�n�o}%P�Yz �MF�Z�
��6��{�%&��4n�?�����,D��ڹ���� I�f�Ix�~;�F�Q�VL�"��*���]�*<n�[AU���A�i*�(�Յ�d+T���}�b[*8�����w#����!W:4q�3b�XD~�~�h`\֧e��й���,m���# �HB��<?uZY6Q!�v�������aHQ���b)kp٠�[&p�Cs�Bs����R� o뿑�HZ7YɆx���w�gsS�⧓V���8wL8��"�	�"Zij�	9�� �IB	a
<
�cnJ���_n�B� ���K�7󁚔��NXf=���|�n,N�z.�]��~�{�A��+�7g1��ws꺤rtF�����v��0����8�Z2��!DH�7�w��
��Y�4~f��iu���1ׯ1C.N�7��H���B�j��T����l��t|IW`u-�8i��j�*b4���Ԙ"��4�(�@��Ӡ̌Q��?S�J���Zb��~�h0�Ax$�lj!<�B8hz���|گs�&"�&FRip3�12R�HI�bTb	2�%;���kЙ5w-ٛ������I��"���Eq��R|s�c� ��l�ܒї��97�Zm��S�(	�[>0�:/D0Ҙ��|�f��/�K��/�+�2v'oeuҁ� �V6��p��YE�������hW�ЈqJ��2�p ����@L"
��d�o����O��O�5�f�Kꎘ�}�,�%!�HS��ɴd�$���A�F�7�1�,UH�����fW,Pͽ=2y0��p]�܋�ޥI
��b"*��ƛ� �`4m�4�F�"���WG��k�0�\H @n�*�5�r]IL�?,�uŲ��r�|�@]�B��"lXU�QZ`�v#��0�o"���?��������7��-W�Ү$!���/O�܋I;,r�O4���>��G���$Kp�������p�3qڡyj��ɎDM�n� lX�8�@�fη��ȟP��y��V��~n:m0��������Ђ3���T*�)�U�F�*��d�8���A'r<3�4����j;����=Q���	��\X.�&�p��EJs͔�645j!)=FxX�Ԡ�%*=�p��ۈa���'5���t����/w��w9!�����&�ʑ)����E}@���s���I|z��ܓ������g����`����#��b-�*�k)�y���3�͟e���e.+�A�5��o�E6߂cP[�J�$�vz����z�$F�̔����^��$S�����͸�'^Ŕ�c��]����"�DI��Zp8KH9j#.�hc�`
0�V�)�ÄR�( a��$K!�h��}{p�}P�8.����w��oQ�B�S
�.a�^	��JA�&��9K|�Fv�G�e�+ ��������6�J��!{�o7������	�Kp��1��!p�U*��ǒ�3�q�B�C��4�:)�5�4G�bKB��#O{3�)�)���k����2����~��{{�!x�x�hɤT�u�RR�d%7�(*0�(�+�kLY�������C ���&�y҆�hpZ�1����y'ڋ+�9���'A�v|w���,ր,���O����~R�bY@JO��cP�,@a���� ��c;X5ǧb/�	e髴0R��
i˰�,ٶr�ءp[ٙ�t*#Q�:�x�TQ�(6v7��ƈ�y&�r���7=��Y�/�۳'�8��m%Z��c�)b��6�����蒢
)p ����-p��E�{G�u��k)��*H,q�VI'ˑ����&Ӥ�O9�����z�=��S��A �r3���'��)pu�����cI?��&y^��j���X�s�Ae�f���rJ���
�S��鬧$��P2�zJ�:wq�L�u�k�I=����#�<~mr�]D�qP��x�`=�qP�8d�1��5�.�%�u�x@n��E*q�R���s��I!�=Y�$�w
�=V��do��Yե��F�M�"�7sC�������3��^�����n�-�����K���Q��	Hf�jj�!��sf���H�r�t��{�\�a�GB�Ձ��B���e�����,�e�r7�%G����q^��P��?���=�"_t������
V��0����+>����[���=|M찴��:v [�tՆ��騧b8q`��H!"^�!��S�:o.�M�	�����7w�o��ʮ?p=�Y���~�=|�s�r2X��{�{�Te��B�b#)��2�J%�E�|K�c�RvI��O�*.�%�o1b��T+�Z��tw�hT,�#̀8I�0��.M�?*=���ke=���J�Vf����͝���u0��w�|��~~'�'���U�w�v���?�������N�΅���O�㬻����o��v�z����Y	/��O݁��}Ꮈ���4��ږＲE7�nYN�>0� }�4S:s��j��m�U����ҷ�W�f���������λ��O/����φ?��&
Rc;����X�J�l��ev䚸��~�������G�Q���[����F��
@�e�y�r(�CW�b�zY�@��2��I���p��=ƌE��I�8R����e���ڈ��;s�w�SC�8��;ܛ����CJ��Q��+A9����0��F*	��]hv�g?�uT��1sOc7�w�m�e���f�%�]�5ܖ;�L�ۭvk�PXg�1GD�Y ~
��K5
�xb�zu    aGɳ�q���(��M6�XQp��*Kv҇*>r%f��ԡG�?�a�= `!�bI��7D�+4� �@�8^�U
���3;��]�$T�8��۾�����칪c���=�.��z>܃-A-�� ��M�d�$Uّ��H��d9e~7$����X�M'�7��z�4��":u����"ڗ���1������`?�I��˔�v�R�cf��-��Q�Q9&���/&א�6eo�)fM��@�@�гm/����3�7�o-�O�i�!�5�Ș����Ȑb�qe���iD��Hd �sJ��D�^�L8b/B+F� R�73�[��V��� ��դ�>��y����WT��QW8�hC�RI�%� �v��͟��;1�W�v��y�N$�~�[���["�=� ���i�{�����ʙ�V���M۩S�ɋ�8}��&�1<z�c�ؾ6�@���,
'FEX�0�Y��d�cM�Xw�+cH���f�ז󲂠�넑��˻�v��ߥ. �f9�$l���b�ej��DJ��,,5����}=�jV��]�-�����"�%�Hx��p�����E�02v]�%[7n�Q��=� ��if�P��܀�"�����1c��R��D!��ۆ$"�q��
���p�*�V���B����I�ͧ�xc�1HXЏ�Pj�������V-���:~���GL����/�J����(`�
 �a�1�p�A0��ml���RJ>�h=1�GI/̇�lH�Oܺ��������P��H�%�.1������2�F�ئ�����W{4�}���E�w�������N�Dh���s-)�p�A�0�
H|]�����πa���~aޫr�F��i��,-$��*Xz�B톱���s�m�o���=z�ӱA]��z��R�׭���^��u�E�#�0���T6�)w��+�AE�T�:_P��j{v9V����z!��^��TQ'q�!����GP���t����U�\��EE��j��o��Es0`?��r���G��f��R�#���rF��%3R�Cv���S��G�(�0�%���1�6V*n�ք�ɌZ��B-�M{=���Z�����1�e6��p��҆K*���hv�� �g��@!�k8<�^5`%���Ay'�e�l��T�Y��D�~�	�A=(O�j����/οS�@���P���!jP`溓��+�UR���A��6vj�.�3=xpIWW$m����ֽK;zv'[�*U�Cb=AL��&s�Af�`ō!\~X�-��&��i�+�,�xn8���}��v���k��'~*������(Q3>��;I�&|�X����t�]��KK��mon�mz&ȯ�0�;���Y/��v4ξ���V��>�f�<���p�������x7��?�[��`_{��$ݱT?%�fAWF�q�V�G2�`��
#���+��)GP��O���6�h|vz�8�s/I%�v����ͬ����J��g���c]��\"KC/��D���|#(hʘ+���3LH6]�ߕ*�����k��i��F�E='���:�l��;���h%��3�c��������|���� 7�s��p����N��q�����5Em�� ��k3��hT�}����m'��ǥ�T�E�Ήᤴ���hkM7��>�;;�9���-0�1U�9�Rj�R�g
|=���v4���s��X������4_�u� F����!�eƟa�-hCPy�fZxZ$�����«L 	����E�T�t�zl�xK�[�3�)3jS�D�7D�,%�qMT�^v��F�e{	�2·�h����<�V6#��F�D�t���b c �u�騋���K���v��qc��1�<y��A~�ݤ<g7ٰf��z-xGL�������n��l|�cJmq�j`
�����Rn��r�CSzϬ^h���Yҷc�P�H3F.>�����2�JĤm��
NLg�T#���0�*�ے|�2S�uη����Rߜ/�N��V��d�1[�F#%(�-��X2-.d�f�7����	n�!��S7ۧRce���7\���&�V~�Q��������Ίy���E��LxSw5Iǥ���I���PW�p5k���i��?�$��y/>	{9f��������H��}�M��⳿���'��$�;|�/���)��{��Ǘ
g8�t�,�$�fx*�:�Տ�=q  �
�����=,�[�OB��OI��h��&Ҝt�Ѥ{�0�&)���H������r�������$��	����L{�.����������xH���iy*��LUҶUD���o�EI���Ƿ}�����UU6��p�y���x-L�܊ ����$Nz��#�����<�@�"r�&nۼC6_���p�~9nG��8��"^UZ�8Y�f���r��?���/s�n�F��z<��[s��,�?
Crb�����S� Q�d��;�y(C�2���t�eR���k�f���W\�ʗ�`��'L��kL�������wI�_�w���I���OX}g��u5Y�FO}YZ��v%S���ʑZ~>�/�މ*7����/�8T/�Z�>�q��]���~�����]�|xC���Z,=��(Y�O�F�uq�7a�?���  ���{s����sF&�v�t��;�s�����K��n`9�ꝕ��E��g[�������T���x�e+�}!u��:���O��r��N�rn�LhV�Ǖ����!L
JU�]`=BүS�I���.۾*MXp��Q�(aZI-b��j���l[�Ě�+֭��h�b(�FT�P��&q��i!�QDJ#i���eW]�/v$�)�B����	E73%bse��JaҖ�e"E����������|�5}�Ʒ^������[/J��:��&,�"DM�p�ֆI�xU��,���M7������nl���{l���9�kv����zb�a�q���g��K�m��߸�Hv�����nz��yw����ҹ�>��j�O:�w�^x���_���n���Iw_����v��{�!	7��l�;wzk
��͎g�h�.ju$�=��fH�o�����z>����~ǉ�1���}����c�=
�K����T�'1�oc0L��%7mPv@S��)��϶�f�6XŊ��z�0�vW����:B4���>��2��5��"I!��T�qΥe�\�N�^5�{
АY��a��?@S�5�7� ��Y+ '#ф1#�ƙDR`��0�K��>�0���T�b��X��:�2^z�4��7f���T47C4˩��|�vL�yi�s��C淐W��<�dq|�qȳ�e�a��ge�5bǯc�>-���ߎ)����┫4�L�c���'�5�n\�������\^]j]<~��鬤�X�4�l;֫-���⥋��ԇXqE�жa��P�B����I�U��Y}j�h���T� \A~1RBJ��=g:ȯ`1�e�rXcߏ>�����?��u*��NE�:l�T��P��]�T,_���TfVΪً�f��Eo��Ly���J��=D<��|x��*�ôB��Z.2N-�Ɣh�N�)�S�~��t�ȩ��1%��.�cZ�R��e��n�����
�E+S�88��6)��DIFiK��A||AcXzHVh�5͹����P�E�6��z��	��խ?�������#���e��j�E���D��P��݆���.�%�х��m���&56-<�.dHF����^�����^	��������>L���6lw�0Î1q��7X����g+H�ѻ.��.�i�޼_(p�X4�7�f���yK<s�ԩ�NPk�����`7��R��[���%8I\FN�p͘6!7I" �2X*�E!����&���̣��i8��3���Oߙ�"T�$�8������1B���)�M�>	[:�;��
P����cv��'�t����%�{U��;��*Χ"T��!6M�Qݱb�u^�\�/���r>[�!�8l©:zq���������v�3,��VG�T�_�\��QK���$F� ;  {K_��s
P-}���wx>3����jF	C_��3�tqҽ�����q�o+���u
c=*�+�p����b%Q��ʄ��|�'��-�ӳj���Z�G]�)�U<����_��[Ig����܈��ל
��{�ck�FLU��r�"��
O{���xk	�%t|%�gF�+ɔ��p͈��؞�T�%��(���<WQ��<�d��3��72��h	�$%���l9Ht�'��|KێNL�����t�iprP��VO�iE��]�G,k�*�\��C��������a�b��t"�9�t�V���
O��������& �8X�ʇ���'+��Bn��R2ũ�XF�F��F�4��"W�Fæ�D`r��u
�[�W:q�¬�������q�y?��Nk����?�1sO	���S��`2�هt5�0�K8:�x�����c�!�P&9SFg*
$%��m����m���_H�0��T2ĹR0.ѻL)ʶẖp]J�t�&�:d\�����Y���
�m���T�A=h,����y�Ё����/�F�0����͏E�m9޻���k�i/<f^�#��툊��J�7� c�۳<�wb#�5_bV����8>Oz�qM�߭��?������g�IKڋU�t����霺������̶�̓r��}8d��7�q~�W��P� ô�k#
pr0[��J�{7��4�A�jL�C5��a�0��l�sf��ZhJ��Q�r���� V���u�P�1��p#t֏�R�!11�2|V�]�`�
U+�QQ�#N<�:1 �)��l�b����OP����H�V�٥�鹘���>��jW�-�6�q�5C��)3`���x@��tq��+��i���볣�K/�0���P�W&0�Dl�`�9Js�(��F�������jM�6��J�4T(@q�;�B#MI%b���̵�ˠ�~�e�5��r��`۽nj���K֥����h7�	��\P����E�b�'/6�؆N��XkIpQ��5J�l��lBY�[\cߣ���Lwq��G׆��!6�Gw��6�^< C|�¥�Ks�XWC\��IJ3�bP.�ɖ�e��Bx�V�Kf	�B6������ݜ�<��R��{�A��J��W\�m{� >�}��OK��U>9��37�6���U=��	��b05�:ƃ(͙��Is{ִp{�EP����^�$�@ �B L�B��O�/�dsb�\��t�t֑��EP�s�H�)!L	�bvn�%�(�6�Ewi;�DǨ)�D�n:�}��"�UUDa�ٮ{|OEQE'���J����mXY.�KI3�ۃ�Ay� �p�(@��h�>D�C���w�r�q-��fCa�Ѱ�q��$�WZD�k�To�}#��C��<�hד�y�@M�P�/x�b����" .��-�O&T&9Rx��$`�l
�#�-� \��'������T?�2�Y��}(�@t�4v�8�}��D��z�s��K'��ə�7z�`�|�l�W��|/�f���z�A�x@���ͥ%r�N��R�������L�b�1|��܃̇�)J�?����k�Ǣt&,���H�m]zj����h)�BI�xg�.�����G,��Ù��gV/�=�Ux�[�.=d��,��j����� [%v��Y�{�aAeU�.�ʟ�S�ܷ����/7O���w�3$��|
��>x^�Xa�YL �&r�2���Գ���`T�e%�U��]˝{����z됱�s��'皋35�q`%<(��G�a2���p*�R��T���H�]�;`���dJV���Zj�[j��f�����H���T̌�\Fs0�(T�@Ҭ��V�TkIc�,�;���|Bh�j-}c!}���'�빱��z)f�`Q���j���P�#v�F�1��6t�����L�V15mo7������	���Qá�f�i��Zl*�B����k�3S.���Q�Azqf{��)�0�Iuq�x	�+o�,f�"ADn�`N�HQ����U~���QC����^�{�Pc3v"4�������%e�!Dy$4u��x�ؙ�������      �   �   x����
�0��s�bgDl�ґ�B*�y���b�?�ۏ�d�|�|yYg��eS�y���f�aAmzf5:�Tta�	��{�/^��)�@@�t,���b��NNeL����:��h����0�"q������!
�ȹb��Oo$Bu��s�-�,���1�Ì�m���Al��>�2~9      �      x��\KoG��W�] Yp��HbO~d�������F3�pF>�)�x�FN�$�Q�(�%�RdA�b�������y�*][ ?��_�W�;�K�<xX��������G��1�'*+��-�T���U��{bF_~U�j_U�������ǋ��G?|��~q�/Q�S7Š��
�i`.&��������Ӌ������
/���CX�)yU-��(�6DisG?���$$�-?{]����\�����U� lC�oYHaI{4�r��uc��~����1=�]����g��Q���ִ{q����AeV��(N�l�ϋ�'X���=2��v:�~'tW���\*�Z�]�}&:p��.��=�m7�(1�ʊ�&�緩��@�����c�B������vXC?K�̽'�jo�mg�r:�B\I b;��{�w~F\[���Q���)Npe�CS^�דU�GIP2򙹕S��8���}z�P"��ޣP�ſ"�A8�L�E6�!��ItlOy��T_I�`�+��:����4K���s�z���G��A ��2�k"�
�w�C�F��}�������P��$�U�8�oCY�	���8��|��A��#�(ys�|���o�E����M`����+o^^��Cga� �N�}a�EV��Q�(���Na��2����Z��:�7�x`�Zb�� ��!>4��*�����;�ҵ���:�W��5�h�k��'����ZK�� ��?t)�&ǆjD�D�`3m�
�x�5.=�Uѷ��p٧�]t��^��nVک:F4JFT6��]e�-��"���V��D���޳�@��5}*# �O��L/c�GCG��O�h긮��@��:6�~F_�\���v�褋������Һ&&F�q�@M��R��b5
 W�he��|��nJ҆�� ��U���JNu��e�����������PJD٪��DR���M� �A<	��z���ݳ����"�`jy��E��8�H�gtrm,�R�\�$�-�N/E��ҷ�3N6�L�$`�nԳJ�S�/�@A�i�����S���C�A�Xd����~ Ϛ��LE�۲��]���q�wC���hPZ�.��u��Z
�Y�p�~�݃hBg=���YH:���u8Qb�_�[���K�pbܜHq�9�3�F簇 Ɖ<;�u˄�����Gܒ�X(n� ��%\a�k""+���؞�a_�ὠo��ˠ�:�]�&77�s8��9Q>��wJ_Q#\4�fB�:�}C���`#Y�:�3��s�D$̪�XsW��d�Rb�Q�S�P&�*4z�Ԯ�N�_����Lٲ:AV�h�g��T�Y�%a�8L�����1n��R;�r7~��+p�u��f�)&���)�����F��,B_����k~p�n��x�	W`/��>֝N^/���{�u1v!˝����)_yͼKb�@o��o�iwK}lQ�2�9@o��)#��u���`?6V�a�t+j�� x��[��[�G�F�(s`�1z�䘈���;!�D�@�9���O�PL���@�sS�k��D,��D�a��@�2��ݕ��,j<$�]�gR���o{�t��_�*pb��Xk�@t�����9�붱��b��Q�����x�Q�b�K��3h{�磓�ݺ��/<��W�%�]ݪ*���T>�w�ښou0��)�9��V�s/��P�!9�G�v�͚��Zn��e������d?��D��:�4W�9�e3N��n�JV1T8��d��h�n��&Ab>��hl8��d�mp�n����~�p��׫V1����e.�*xT=`�	\�\q����U�݊��zT�s�,R�%���l>�ed�ax�bƫ�!��
s��PLzE��Ѫ�jCs���7��G��VU^���X�p�T�+�L2�؁��md��S�P����E�tJb��W�fwf\�Z�ՔA�k[K�P��˫�5�O\}�njdo��>�w8<���
�l~�[
=by���3Rr��s��?��%��~#n(T����q9��?� F�s��x Sr�Wc�r��l�?,�;��ǎ ؍�g.D�M�
�\�gBï2t�"������+W�K��659�8ȷ]ID���ku���@VT���ov0�>{�a&ȸ+��3ǈ�k>��9Ihw4I��[����-�5\���ee,�mC�(#KV/���p�梨�@T =��G2��m�=:d1�=�^��r�Ķ!kv��] ���w��8���Qd�ESg�#DL���xQnU�.���vkƀ	H�$�q.�1TkIu�"9+�����D<�%�f�g����!J����ey��n�9�#T�}u^����&O�T0��(���Ӈ�C�1,�Z�>��@L]�Z�$�u=��P�㞋J�qq��܈���a(�{|oLa�p5� \��A��fFŨ���W뗎m�uT�ʸޕ�\���� ��
SpPT�M��E�ZMs�
�!gq[�f�"�#�ۍl�m���I�	��a,��0G83���%����Z���B�o�BS�:��$B�<Z�su�����(���G�[�#�
�?\��� J@᪕ft��)��vy��K������M	����-Us���d͢G5j����;����������9�33NR���b���2n>�ƃ!���uO>��s�pO���4�DΉ��:f�֠��p\� {eͣ3�j/�f���-m?����]�"u��ϫ�=ë�D9���D6
�铪E�N���ƶ@"_T#с�����|Fa\����l�<f���Q,z��Ǻ�_bhяw�M���1�k֦�&���=��'\d�M�8yy�n�Q/�����fU�͚.�clb�Qs�x�>Rm��4�:��nO��@0WdB��.�	^�$s�h�w�f泬�P�&$Q�ɭ43nǴf��m��/��-������q��+x���p����R�!
X�
��L�E�t���<)Lq~��xD�V��v�n�Z>�ݜ3ǩ=���rL��ȍ�+�P�oHn"}a#�4D}a�����L��x�Fx�V�-|'���#^�9�L�$��73�\j\ii����q%��}���jkf�%n��iɗd��Ű��Ss�S�b� Id��C��P��K2�f���v�2�楂�l7F��e�\��V�F���gh�a>vP�^Y���
	~����G�y>��sK$��.�<2DSw�:�!H4ܜ�q����h*��t�Dno�C��R��ϤA��p�$$�z��~=��-�Ga�a1�=�>��ê�߸dy5��i~ǭ2�r���>!���*V�Y�"�ުh�g^��ۀ��f��w0_�@P�J��خ�g�5t�������|�����
ӿ~[�Z+p�� �U��i��3x\��Y��xgas�_tF���
�_s���o9��v1}����"3%��:W�dq E������ʸ��a3-מ_�/J��!me�'�M���:	���;�@)ߺ��B�֠\�"��2�*�s%ʡ�`��$�3G��=���~�ʥ��M=/GS�6��`D<Iچkx�X�*����{c����e>���I��Pg�����7�R�q|1�7v�lm�4���z�Rj�W ��#��,?
C��
�g�M?��ur�q|E���x�b�!A_���)��{��\}iF�%��,xK�.�����Si<)pM�WۧZ�1���ʍ�C��|�6��M�	��r
�=�5xN�A(�i���@�{/�0>/�58���qTuH�A�&��:$����*�(z��c(� ��F�S|����G�G��� ��(�N�>2Y���3�"�K
�C���%u�c�g��؂��dP�s֑he��
��E̩W[G��Q��4q���9�c���I.|}-��G�A���B��(�k�����u���:O9�~]�Iu��c���0�d�������ҡ-�0L�W���N��a��KZ�%aK =   }[�w���'�iP:���&�S��;�D��2�V*�6u�eTz����d�����iM](�/���Cn�      �   �  x����RG���[�(�
�>�qs���A���BX�s�T�==�6�jg�Q��p��v>zz������������Nq}߿����ۿF�'óqq���a{����ov�]뷢��F������W'��k��=+K��ס��í-�ҫ��d�
�B.5+M�J����j�?����O��a6*I�*�RY�`Ȧ�2^?���t�q��zc��2_V�WdK �<��j�9��y�&��j���ui��'7���d�߹8�������+�������nt�u�*V�O.�/Ί��ݕ����IȘ���]�ї�s��Ag8���-0 4�� W)��Y�J�\�ۼ��Y�d�/���.I?Ui(%�Y�5�]]}���iT��@��$�h+F)6ZO'o���}����%�mX�V��2�\ �a�$��{�~������ۇ�s۟�7w5l�vѹ�$Q���h
Е�V%h�
��룍�E�P�0(��	A��ZBJ%"�Y�5{�㰛�V��l��Q��H���A���%�*�3�,�6%��F3��!�����Y��̕eYVQ(�Z1 ���M%A���u���h�\�K�p:�Pș���R�I-P3���ބϭ7�y�P(�.�-�+�R>"[�@�)'��qlBc-Z��`�B��k��*4l����ƃ�X�(�ڡ��eyҝ�_��$�P+��@���������&��%��;>1�J;c�5{x0nG�I���L ߣ]sp�kK��/eN ��d3j�=��r� c������a0b,F��s1��d�oGod�xm��e�ZM����+��x�j�����R�^)�*��*~�Q$%T�s���3F�v��q2R$�d�^�ȋײa�!,�W;;�j��Z�qb Ϯz#�a���y?�]o�P �r#��|�Zi5����7��^e����y��
T�gB�q�T7�d[��ocd!f�Tx�����G��t� �eb4z��3�<m�v*�N2��ȝF��`�f^�!�z@kj�U�w�d⫵4y��l�	kcdKg-��{�5�:���!M�l<. c.��W�5��~�x%��)�>v<~�-�[����E� ;���ۏ�9@�6��Y#�0Ɠ��JM̾�3�n��\�K����XƔ	�XE6���ⴘ}���	�`1�A���z�d��l4�՜m�sox �D��ֶ��C�L�����ԜY��~s� CE,��6L�e'C�rJ�Ŝ{��:��@�v�-�e�pQ�:�R�<֡kb����ߏ�hB�%��g.�RX"x�e����O	l��GI���;������NFC7{��՜�ᑟ&���P�1�"B�R΢�����A�f]�V�������w"���2�@6�f��>|�� =�<|�u2%�ư�����U�aQ ��&��J�9o5���i�A˰+�z�Kej�Ra������W�����7��R����M[��6��-]%̑��d55��F[_cWZ�6�<�y�3���i&|)�M�Q+���A�)j����
3_k&ר���"i�K��~���Oz:Hak���ħ�f��)�$���������a��i�B���I+�p���|����l���9��5>���]~������ ښEV��9��n�M���;>�Ö"�x��2����R�����*d�^�VUn�      �   V  x�ŗ[S"����Wp1U�]�i�r��CPa@Q�x�#i@�����4�w����4M����'�E��s����Va����&��/���r�w�)���R�K���)]<*����no>c���tz��'��mG[r{����g�rc�M6\�o�Ywj�˗UM/���"�t�7����g�^��⨠]:�ҙ����'6���g�W
v�w�>eia;��BXx��d~�:z�C����̧��h��R:��h�x^��X1&S���9*`/AO�1�e���_�a����J��$P���o^f�j/@���O��M=u�rD�3�j��vn�l�c�����ѥ�3�8d7��[;�!���3~&�r����w;մGV�wOI�4���c����O8|��|��h�(��Ѣg>6Z'�����
t��
!�B���cc4���+U��NHW̑@*�/aU�<���`g�?���N(��z��|�d�����;m<����:tq���e�,LZ��j�oNZ�����w���^�������
ћ��(]镟��]_t���KF�L��va��k¹e&0+�!�c�!��6�@���%LD��f�l�0� R�e{OG��j���^�!��i.G!E�����qy����p����8�����ᆜ=���u�Mn��o����^D �,�捔~x��N���=�(�y��EA+�(�.x��ET�fB��� QE�LD����i����Q	T	C������]�`��g���SLh���Ş(��x�Lx�Bt<�e�P�����/QG`�~�+d�C�fva:[G/{|G*�d�v�i�Щ�V{\m}��}�}����|��p7����Mt5�P�,���˪��L(�B*�CT e�'b
���qO0
	%��+B#B'Q|���ZI��7�H䈖<Ι�r�sJY�	�	���0!���`�f�@%q(lǊ�{q�]�;��YG|�ϫ�հq��&U�<��?���6���zݻsej������~x4��� �?w�]u�kϡ��K��Js�������85P�V!�I�I����#�D,�P��a�`)\LD�%%]�w�����QĆ���"�o�/n�k��z�;ls�8R�o'O�������l]�R5�w��'���e~�P���G|\%�b�i�e
{$��	�đ�S��=v���rZf-c6�,�Y�-�϶&�QP�i�M Bkb��n�K�%��@	�y�.jE>7�G��v��͡����O�A�5�&}��И��|k�4o��vz�)���2}t��I4ǣ�?,
^ ��Ϟ������M̠�-F��MR�$�!	)�#x,�߇`��3��uai�8�w��'��X�zqm]�ޘ��	R�	���3�L:M!���Kf6�e��S}�72����w�M�OO��E���{Xe524�Q����Ū��jrsu�Q��� }����;��d�x.�[^槢KE�">�χT�GA,�h���K�_N�D<��Ccy��2r�|H������<��+!�2H*�d�l�7��LΫ�O��}�~\9�l��{����A��������O�xH�      �      x��}MsG������]7�����̀1�,fW�{T��VT��o،���	�ad>D�(�Wl�_᧼������<m�)6�����<��9竛k�}����;�l�ևɽ��'�a�ѯܽx�뿬Uε�����8F��?�W��+����>|�������3��7�����?�
@��~)�{Q9�o?�}z�㧃W��r�`�*`��ri��E醏��s[�*����7>��J?<^��#~Gi/�D���S�z���Q0hC�n�s�A�p��p�q����C���~z����~�`�V�o/G�Կ�`�/��� ��^<��+�
vy��`?�O���(�8E�y�:���a����՛��F�^���:l����q/���q��W[?�z�hĢ��9F�)���dk�^��O�����/��u���F�8��>��|	/hW�U��}��r� ��5l��WK�`\���E�i&Y~�Gߥ-���NY���&��u=J�S�"l�k���J�B'I~&�}tF�]��nD��؅>��x'�SOj5Dٺ�w��6��P����7�yT�e�Du0_Ã?����>�IЫ���s#]k�2w����ߔPp��B0�z���^e��wz
��&�NfC�����~�q��������]���UO`-�q��;�}�����S�~-ӄ����D_��*�� ��T�{ئDO7�]b� O� wd�T7�N�1�F���_ʦ��w�����*'�9�|vu��#O�k�'�M�oגt#������o�H�`\�˻��~y.�+�
���;�.��9������$��9?�Wa(�zo���7��vVͱ���wp�va���1�;|��VG��3�Ld�[] �M��"8�v{EcmD��r���&J^^��M<�	� DX�I�n�,�=�!��{�����d�+[�\
�?�o�CT�����n��Y4���g�@?�+?�,zFɽx��S�㞢a�T�_���z_��\�=�|�6ɽ�qa��8Op^�^%���v�F�5إK�m$�t��F���m���>l�����x�TV���,JueW`�G�w��~+G_�y߭�@V��#vj���h�'���-P[t#��ux����w�-��S<~�u��o8��;���~a�r����h�s��
���+\x���^�d�U����J�������h����AW��;��b������[����u/0�?�-ޖc����(��S��6>�`L��zcF�����`@��7�O���c���.��3� O�_
Jz��y�=J��]�_�i�>Ĩ] pu���X��c�<*ll�\u�O,��W�j]5Z���F]j�5��s���h+Z����?������[��$[W7�N~,��_�A�v�R~�K�~���kBV�C>2�B��K������h�(��6��;�2A�D�}��FA�m�|uO6Mځ��E怹��������w��H=
F��v������.���-��u1���������!w���]̘��=����3O=����\�27�;��[ǃ�f�%p�/��W � 
`L�΂Js0۶�� jm���)��27>Ǥ(���4~� �B��?��m�R���G3����Z�J.m-�ת���<}��;�z<ę����D�U���U7b�_�+�����W��l�*J\(I�L���X��X����ۙ/_m���=R��r�-�}�T�w%��`�C�]g»�Y�B0��OtH������P�oD�x�$���oሐW����nvȔ�5����6?Z�z�]��i1B�W�L�˪++��V�e�h�/�Q�P2�0<�/���t�U$O��">�=�U����c��\����}��֢h�V[Kt��Vm�5!�邢��7��\��4�Α����q_�u�v(�l9���ҁ;p�?��]s�$��11��T��;�Ee���J��������4 sLv��n��.��4t���r1�u/zK�%u/%C�����<��6��i��(D�$R�����Y4���>�YR�n� 9f���j����ee.V�F�$�>�+#�*`�.���P��Z�k@��O�#�� n�Ol�v�u0v��}E�(��6��|/7ȗ@��E�6տ��9���u�.��Ov�8g�M8ѿ�%��}/�|U���DY��sƯ�FΙ
��<���Ċ��2l d^���f�!��`8���r���zu���[#�	���S٣��]� ^�y� �x=掕O�ujHI͑�Y�5�;�v�?�R���rob���﷭�U��7���O�w ?��9A�Mׯ:`!�sI�VH��[l�b�J��i�Q��b�/֋t�}c��i}&����\�4��q?�����>H�}zpσQճ�K���������Uo�1��N�RT��W|�h3q�K���U�|~�����`m^˟!s>�t�H���5u�^�dֺ�}*�����Fr#j�[ӄ�O�)��:&�S�Yi�ě �f�QO�e�G��+y�Y�ܳ"�SɈgm k�_�~�C�Hl���>���HV2�#�W�����?�IQ���5��^d�.b?�+|�-�� .{��מBU0d �G�p����%=����2����	�-�(���;c�&�D
�b&� )�h�� ����(fV �4�y�����
�ҵ��~����qȕkIm���H�8�����Z2e�)<�e�,׀)�B}��V7�C���ө�+U;<"�Ljh����F�~ܣ���=�G�1p�d+@��oM�d��P��-�1�Կ��a�D����V`��ؽNP,���X�)�5@����hF�?��s9��K�ދc�t8!2�S��k5�����إ8��n!�y��;D�]J뵈����sw￐������0hK�<B��/I�*%�$�c��'�qr�AN�/���s=�b�!��1�@�}�v]C�����/�ce;��	�}��s=w���շ���[Ŭ	���s#�J�;�c
���փ1ե�1KM4t0�NF4����� ��\�}��&��M�%�y��^�pS3��h����B��t0�n����"�I>���]�6I��a�*�<�wV��-�r#�TĈ逋�ڟ�Z�ޤ94)�
�@%ѝ��8+�� ��"Q~
ˉ~O���P_���8�B^�eC~�%:�$���Y��8��@j�n�b����>6�%)������7�����DT��v�ҥ߳�ٕ����g�B�q�:�5Y��Uz"y��2�&�l��b�,�o��{i:�\qz�(��Ƭi��L����y���u��oѐ�˾Cp�l�{�,���Ě�t��M#��T�!�^�[3��������+w�}0����0��3� ������V���ɩ������7k-ڄ�KO)����Ek-�|��q�C�4ha�"�g�L�*����>�Z�%i4�yx��K��p�g��%DSֺ_F��ӵ6N#�:غ ����� G4����. �6��`du�ԑ��V2m����z�f���-���^��=�RIIN��Q�!8]��DM��-��lc$��̓?���R�=���A�e B^TX�u�B1%�r#���=�85�St�T���?�DQ�[~ ���D�X�d�"�U�E=���N��3%��*0��"�rg]K������2e������R6Z�����h�� c1�.(�^qQ]�.�$�.(j�����p]�S��ʹ/�|�@.�t�����ݾ��Y��N
e�jӞrL7͵��
4�t����,�x�V�\c���:�����P݋��@��z�7��%��R�$�W:�7�+������)i�#_,~�TdK5~�;���r��+�rY��Z(%��[���׮�k�F̍8�EF#��:�BE6��)S!P�vt!?���UXC	�(>�������~R`�%3��jy庅x�W��x�9�u�6�I�c!9�^�����=%IDv�ӇZz �G~,����)�h    )�{�/f=s�,�?�?�1��pYb�Ceߥq�n���궍Y߻?O�8~.::lJ�?��>≎]��P��e�L����O�E�N��B-�����1�?_�b��W�B?�^�	B��P,����0��R��PM�g_�
��Y����6ߘfDu8�́�Ι���m����}M+`�h:>���:PG��J:r��8)����[����q�z���M}Y4��E��7��.���t����js�.8�е$RER��hs���s��=�:P*��N���ۡ���o�B����+��4q`��l����'](�Z��xRu��2����Ӣn5x����M]O��k[��j��E��y"���S񪊳3f�V�]���]p�U��FJ�@�gS�yq��޻��s՘��&��KN%׷m��7���{�����w�o�I���@�o��dĤ�
2MM��Y��Co�g�"��O��j��R�U ֺ����"C�3�����v �~ف]pRע�Q�o�K�B\ȵq��KN���(��xG��|e��D�����,氃h�o��n���w��I��a���Ք�+�;�v<<��*A��כ��Zg�o�S��ݕ!t!��Mg=_f{ JUw���Ӏ�m/�4 ��Pţ4����Ԩִђ��ʹ\ ����g�P��.D���$�!x�J���k��3fC?���I��a�d��T�ݍz�/81����.�`�u4�s�?�b6���k���rT��W�LJ��o���3r��W���V1�Ç�dI���8�ʼ����Dߎl����F@��1�T�
���f>��_M|@�H�j����DC�������:rs��4 �V�Aʍ��g�&��e�\�D]�3"��Q0C�>�c���۰���L��$[��p忒�o��>��p��ڣ���q�y߁��H���B��?���J�B��]�O��l���VFi�
ժ��Ћg�8�Z��L`Q�xGK��<�3t�>k-�o�z2`r[z��GY�*PT�C��C5-���� %U��羚C'rG�������-��9P����'�Қ^ �]uY�&/����n�\ʏwӥB��G�l��l��75L9Yh6G���mkEŁ�ȋ��ي��S��sQ����X
2�^��Eh���	�}V[A����F����FE��� �v15}uEA���tR�J�[i6y�X(B"@mEwyĖ�sWT�"���gZK(+����P'l�� ����k���m��埳r#���;m�
i$x+�����$U�K���o�J�(���ɓ��[u5���O]���6�*���S`ņ|gex�_}��i�i�#��QL���Q뤩��t|A�_�YJ�n����ҩ�V�-Ķ��[<S�.�XӁ�����EE���IR햃bi�)�h��2�9(������l��,�D-���4q�xE%��k�Y�6�Zak��H�!+Z�@� l�=`F���!t#6��ST��I�T�(7G8�ǁە6��B���$� b'Ii��Sf�@��4�,dq�n	@�����v	`)U{������~6�ŎFSmO:��U:�[��W�h�ӑ6�[��ǲtd\{�����o����:�=xȁ��A�Q�KjR�����$.��B�İ���r�S�$*��or���Qo����Z���^VR�jC*};#������.�CYj#��q���q>Ώ��E�l�BT�x��d�	ϠQ���u����E0�,�[����(NRj��@b��Ci��nC��M9K�V�t!���n��հ��y�S�{��(lP�$�&���<���ݣ��~O�o/��єQP�(��B��������7>�*'�E�})U9����#W�Pi���"��,���ʸ74�.���;kGU�� ����Vu\F<����V�O��%�E��Z�V����'���^�0b�2 �d��\�W`�4ؘ�*ګI��Z?���A3E�"C��.��(�6v�b)��PF{-�2����]��!PF��m0��.E�%fbKg�#F���gv�P�Z2��]���THp�ȋ)�p���&����[b[[#�9��WR����]3궰�hȹ`�ē��`-*�ŋq0.�CR�'%m��U��9e[�
ݹE���P���x&�/�um�v��ˏ���.�^�U�_�옮#2e%��q�����X5!o���^Y�<8�B�K��E�P�@�la��d���u�YR�n��ʋr�P����ޱS�Up��
��N94[q�$u�v�f�9^ǟQr�J�T�.F�M����FzhK����`0l�j�f���ЙW�NܿO���>A)���3��0�%�ʘV��)bv�I�B�֡��Jaв�Y�-�T缙'5�Ն;M�P&�F��n�ucA`��94���[]$����(��-�<2y
�L���ŞH齘�G�*ДS���)��_�:(��bU�����k9�XJ��
�"l�
�����g�[? �5���C�ԭL�/`��=��@(�Hy܌*wUT��	L��z�F��s6�]��\������B-��
�;X����ؾ9�.�HL1����t����2��dʹ�ȡޥF���u@���m}�������$sw#e{�h</q�е�j��`�l��cz9e$V���M��V���}v4��؜Z����]@Φ����o�` l�6a���	��+��X��FС;��0B�L�a����[���h|5��L�L)�Jzc�(9� w0�lXw�7rR� �㮢���.zFR�7�!����G�n�D���D�/_��.�}F~!Y^0_�k-4Y&��>G. 3��3�����Y���.r7�����Ri��r���<I��)�1P��w>���g���Ź���	|�/v*�\���5#mN�����\�q�r�uT�����������#�%ÿ�x_�2�.���E�j�M��3p�r<%�m:C�HH	���:~�0��g%������0*�/��d}bz�5�5�`�ѽ�7��t2Յ̀���I���v?�xĵ���o&�҇$�w�����bW�3V�o��?�An��J���P�()���}��<�[K�Z5H>�������?o�>\�g�m����)�3�֮��
'���WNV�)�E�V�`5w�t���A�k@��?�<v��#�q�k�]k#�����۳��t���Deݨ3��Դ"޵v}����5�Z,�]j�����q0�b�=#G����1��F�)�T���<8��P0�2�W�߯1_�O��]��!���[i��Q���&�X9P|S^@�z~�C�&e%8��
���i6�p�y�KБV,O=��J~����ƞ��bh}�����!���{��-X�4w%Ə�A�Edç�6A�`��y�U��%'�5���
?�O��Gֶ����7#5�O�t`twIT�<�D
�R���Ԭ�IB�t�lT�%dx3�լ� Fnk�=��axĶY�b���$F�fͿ���*��dș���_��ޗ>�&�����lx�ʃ�*�p�i���G�87�
?Dn>ret$����'�b��!�C�6����������t���e����ӯx�.V
^���_�aXw�B��BK������aram���������������5�es�y+�'*�w`�6s��Fu�l�e�K#.�߉������O��/e��>5ƪ�P��T�=��w�p��T����|��`|�X̅�3o�[T[o��#��#h(@����4o��c�X��դ��5�F,:��#��)7?�p����P���9�	r�U���-SM�@��W��c'��:O��=�����j8%\۠k���[�Wv�<��K��S�b���e��\!v������7���T��sn��h��P
�����������1�U�7_q:ddߋQ.\�Z�­%���^>KԈ:�}1�C/Q�!�)�L�\�c��C���%�I�b��nF���{�(K�	M�3E_�;��J�G�P^�����I    ӵ��Q�
�DzD�_��oU+�|�8B�X&�z�̦
P�ֽ_o�>'�(�UBm�.�0D����<��K��
���ؕ����X+�ں%ϥB�Xm����,o�d�jźS3���V�ׇZ"��ئ̔��n�Ĩ���1��vք)��`hC@��5��~:K�Ϩg����Q,Ee �5ԭ�F�X���+��J"СT67.�h��Lƾ$��4<F v�{�ϨRr�'#�*��xE�(֌��́�v9W��9��D,�*v�#��u��9�aJ]�[.7��V������50R�_�c�`�\�F	��&��c;�h��Mbt�Z��;���>�O.�-X8��
�9d�A��R܏Vհ�C)����n?]��(Zkj3A]��[A0�&�BAq*�@uC07�Q��OOs�z��C�3_/�*`��o �B��� �0�[W���=FS�#�x�E��glf+�z���]��%���N�})I�D�}������W��ύ�y����6����aT��$x�7�*���[A�~�j��]O]
�l���s��P����?��ս�e�E�}A�A�0U�/��)��	90�C��ZoFC�tR�g�[)ܗ2JfW�U>4��J�-DIL�~�e���U���h�� W���,+�!qY�RZ�(����8�1����
��@k�,�`<�S��6k��\����$�׎k,��V>�Uȑ/M�I�J�z�Ԓjg6c+x�N��.���%Wh�k�x�J���%B�C����l=���=�����Bg��u������7Ȳ���ȨK��
�m���Ѡj�+��R3����IE�2�Dwn&��U���B̓}my��r������T%x'W��ń��nE
��>�N�~#��M=�:E����H��M.B�);v&\�t�/�=���r=j�+��ϸɝ��3��hss&��'����V��ue5�.q��y�D���[6��^����m�0���ȴ�F��3~��D)Yʯ,�˺5����~+\:�N ��E�R����`�C*��v��*4�/��x�5jA[���S��l�o%4�L�:�/�b亀�&���ƭ�c6K��XJ.9��&���ņ07׬c���Ns�h�Z�&De��Z��W��m�r=�9�~�(�	N��q�L�-cb{)�J��=O��'̆���� �jbg�h�ݰ�Tp)a4q��5Y��l%��5zA��i���MNk�o��L��/@ҹ.�^$ب�s�S7�uO��hn����FS�>��<�f[KH�x>��b*׃�ѭk���{&�QQ(�8i�QgAm�j��R��e]�o���W�MQ�W��T���n-����;��#�����+�±ChN�[��4��:���lX��G my5Z����Eik�H��Խ^q�Rg(١��k	Cs_x��XPiv�L�\)��R�2���.^R9a���!E�W\��A��O�w�pO�E��u�u�g����c��Y:��	.����Ig&ԩ��np��L�1��as<��Y�{K��ڒױ�?`P��K��^�_�`[��x X�ZmY���+�x�������n����1�H%�/��3��lAc!�P���ul`�����=F��s��v/��2�����n�7��_%����G�.�視����wt{��Hy'uP����&X�\]�*���N�1[��v8fG{.�,Z���k8\H��z��(�M�}��F{�� <�wqjҌ�z{ ;>Hh)Gz��Z�Ο���� �ĳ�Bp�P�Jo��6�P��Dʼ�E�8��լڧx�u�7�憽����͐�����m��8�V��O�of�N\��_(���	��KWp�J�X~��
�i<_��I��6 w��O7�Z�S
��
*D!q�ڟG�e��	4�z5�b诧&е|_2�
��k�M�����"c���;16�(��JB�9=���1��#���kH4�_Q�AƎjTu(n����E�рX�&8�	#�GTE~g��ʏ))��P�r#Ĝ��ӎT�6jX�p���N�R�-T�QfO�P|�zB�h�|��*ߊeΥO6����~WO����y �Z���Cyo�I%��OEnB��n�8�УO����<q��f�x��巁1}#�����Xt�� �>����[ 5mW�F�o�3Zn��.\�F��l1Nѵ��Y[�Q<u7��^'�-+z��Ƙ��o�HD>�����L@C<X�i���!�Zs�xz�ڈq��+�	#������gB閟)T�M�Q6ϩ���"Ĥ�	��pd�+6�z�O`�/hq8^p�Ԁ�%�0p�0;��SH6��M<��U����8��隷įrd=xd�עr}����XH�l����3]>�Υ�����4�٬֝��7L
t��1�QIb��|�{q�͞�Z����S؂sR��/당���7�M�lB���~e �M��j��D�sʙ�����[��-��Z3R�2C��#���Ѻ�%�����
o}6�]&���j�6��MTx�"��	���d���P��"�a#.BP��R���[��.������M��Wᝓ�w�'/!�f��m�߬>		���JL�����2��P�o�6TSe}@�R;M#e�15�J�i�OF_�\�*���eERRb���H%�M<S���_�&�Z�|dM��M�9�z��Y>��&�i&ȃ�I�'�)$�-Mb9����A���T��*��HM��ߑ!�d���2���o�?����7�c[�^�>�@�M�Ji�&�j`<Hz��Y!K�U>����R�|{�/���螈���i��)��В�_`G]IR� ��YN�m`���2��n�L8�P�'Q�������*�ͷL��-Q���
�t�c�K�x���w��E���m��8t���^�lFL�Jܗ������mkwC�[HG���.S[��o@:����@F�?!2�k�M�^��)�S��Ŝ�> ���ī�������0�|�L�+lG �
�l�1��NoՄ:Fw:�Ja�N'�RX\��;�;�`���~�����֭��	W����I��-�Zc�C;ܕL���.��y!xٚ��+��2��k4�3G���#y�"��^�����~��S�"[��z�|�oz@����Υy:�zS�£:ѭ���|�~!�y�{ږu��G��OE�m��LӨW��'ܭQ�
��~G�@��dEG�|+r �v�l�J=nG=��o�p�=h9���4ӻ�����%��q��p�X�c�v�?;B��˛/��Ă���z�����x.�@E��l��v1��wn�� ��(F�d�)�z�@��
��c�.��`�g�x*S]J��6}3݊�RM3�(���e�o�t�o��.Ԅ9�Sr�ds��p!�&�P֭F�X�N�
̑/��빘f�CI�Z]�=����`�u��I�*$�n���h˯�> 3u�$Ńq����-����>�iZ�G.��ނ!�YI������6�I�0�3�+Į d0nB�[4�&�8�S�E��}�G~��!E�_	���Y��h��Wzg&���Qb8�d�\�B�=���h�^w��)�%$���U��D j���F��!�'�dN�v���Sʧ�л�x�d�׫@�Q-	!�蝦ݖ�L	�0������L!	uSߐ6���F�-��W���/ߕ�SY����2P2���ݵ��\Ʒ�h�z���P?@�8Lf�>#z�#���
e0Ğ�g�$N�
�v������"�n�N�A9�'�@���r�?+�Q� ��h�_W)�У�R���>V�M|ᤝ�#"���&��jt��w%�ڪ�T^L'�� ���
k^�TMkh$L1��BR�c|)?���Vﬣ<�}1�N�I-��4��;��B�g;O���@fP�S����`<d�E����O�c׿i�=�Cx˼:�F��Ԇ��)�Gj�G�h�V��v���;�z���`<%w�1�vM���~�XSO
����&U ���2�����L�&Ԫ    ���c�=Q��&�Y���eC�MP"��%�RW88{S^���ͬƼa��/\����"��۾@.�k�z�|�2n�gL7�CQ��6&�w�ݷ+��;��o��1iޓ�#_Y\^����{�(.n������Mޒ�U��,fJ3���3F�9�Z1D{=��;�_��b����� vW�,��`��$9vB�uA��P��y;%�B�O4˔un���L�1­���!�8P��T�"���ƵY���٥�#�N�ݕ��X�J.=�6�irA�:�u�<@6�y���$�?��T�?<���XA.�i��G)vЊ�P�
"=((��0�fČvzM���j�ϝ17�)I����½���Q��bJ����@j[���]an�߲�|J����q��� �i���"������h���
�4"N�
��
�]�Q1����K2�`Pw��XUk����َŏ���2�u��Wk˹*gta��+�|M *���έ�Ki�{�y��RWF�w���7	�l������|0I�&F�&�+�N�^X�����\D.��-3��	LSU����S���៧}ޮ�,`�)�l6�x7[ϭ��;�Ko�D�����;/��:�Z ��:�.,��N��s뗃�#���t=��&��O�~d.��P��Q�b�����#*��ڏ���eYT��Gi�����M�,�f�i-qY�v�?+��>����i��aY�]�׆U�(ʸP�f�Q�N�[tB/��J����-��۳�?YGI�v[E��B�F˱�>Z���;k���Њ�2����c�)��6vvR�Y�K�x=�45[�n2ti�I^�n���*�(�2_¦��tqo���z!�U���A��5Ⱦ_DE�Mh~v<�-]5�~�V���
I�l�c��C�`�.FZ��0k��B{�+�'�&
��-r�x�j��}�N���� ���(��;�_MCe�PwD���\��_tH�{�������xI:�$:{��O}l�U�Kh�M�}8�����l���MǾ"2�S���L)�N�� Ơ3�W�HC�M����.�C+�.�պ�ioqo��f�\�S8S��d���ѡK��H���`6� oOfV�#Y�&����}C�4hHV�uV�WZ��d%�U��MN���P�G�Ԯ��W�}�����%؟��հ�%:��V�oW>�Y�Rҳ��Վ�u�~�!&���=��$�3_���+��gk��zK��`]9��������Tz�Z�����0Ϡ���񤏡�B�"�p`��2��ƫ���D0��Oi�2I�ZAY:�d�UhU�bac_�6S�
���?%go��N(�8�n���D6	?�1_ݑFV[��PC���L@F>��h�j�ڮ4nu��dO�X�1q7��X<xѶ��K8d^u~�L�{��IZ@��a鸒�7&ND,�7?V����&h��՟�l|!���}����� ���.U0iM�ւ��<b-�隉r������m�Ri�h1�eW�[�p#�F.*2�V}l���U
_��}�K�D��f���9�=��7�0�Y�t���5��6I��#9^�����f%`�����g���){������D�%��y�%�є%̙ �&xLXo���iq'ֱ�-���T1��{�zW�֪��1j�,T姇^�:u��朊�d��.N
��J�ꥭpқo�ƞʉ��oa�[���{)#++��1F�1r>iT�,X� d����LL��A�q&��=�3K$а����ѶoT���S��|�q~?lZ�{ᱫ]�Fuo�Iۢ���oȪz�)�ng��kq�v�r�p�0N�KV�r{!�Ѻ^u�O�R}\���ƹ��m�x�%��U=���/��8�dc�z����W��p���>P�J2���BZ�"���.A2��j�ä㱅���_�Eb�PAu9���
���t�LÅ�(.�C�%W�e��u������.�U�d�zM�ԗ[������٠��!<��FzU�$c�LO�Ⴓ��P��E\�������E�ެ��Sjh.�vD83tJt���i#� 7��>���{*�����u�p�(�,&\z�M(�8��\ۡ:})j�gfS��̢�_' W�"d�җ*B�7Б���q^�"�A��n���z?�ʎ��cݳh�H�S](.��P�ue<O����;O�`���X>C.S�eq\=�,m�[s�U�?Y�Y��5	^�z~ѱ��re�Me�Q�H��T[.@� ��xn�?Y��������H��]<+Q�Qo"�b�9f��dJV�ES55�q��=7�z%�}���h=0`��=Խ��'AC7���fN�ys=z��c/J�$�	-$�&���P�N�{B޵h��p�VP�R[�����|g_1I��Vc�u*�N&˿R�\g�:p��D�D%�|9�B�|�XX&sZ���.bS�JlX��, R�Rzq�8�*j=�V`�ttm����an���f_�O�qtEp�
�T�6²gI\]�\	޷&�ba�0Lg����!���;e$���x!W�P>��n�����'H��k��`\3�S�S}.�	�T
���IQ�ٝ	�K�
T�t�S�x)~�uΊ(9Z�^�4	V|>�M�C��d��f�7{��ķ�M�/�a����q���&&���V��Z~����zt{재or��g�1�طą����U���>w�Q�g�ݑ�� ���`�lsN��%�V�k.
�ݣ6�$��ξD�ȷ������G�
���"K���~�JN?���2b������$q��Z�F�10�����e(0��&�_�<�>K�����&XP��zk6�('�*^�h� tCO�,t�;��Q���˖�{<�[$�#Ȅ+I��Y�=f���6�~�-�$�9:3f@��E-Y�d��C�پ(�ЀҌK�r'����@ƨp�n�|9�]J�Ǝ�w\Nl��Y���4�`a�i������������g���@E���~��F{4z�,<��h�]������zԇT��m�*:2H�8U\c�����"AJ�j`?~~�[����N幉�M�yKx�p��Z=�r�ݦJ�n;�Gڐp�u���wfųY�L�����`�kz�{Y|��]��&��HJ5
�Nn������A)��[�.0��3��ր����@��=\Xȋ_p*Q6-���޷3�B��Q[�
��y0x���u��"⶙�f���3�h8�A�)�,�Ǫ�o�D�`��N����]FT�#.�5ќ;O+�P�ƛ� d�(�AI�Ǻ  �du:���@��Tv�'/Kg�۴���Q��u`�}|�ZAli�{�u:ճ���O2;ɽ���i�I�l������}��Q؁�Es�ԝ�D����G�m:C��Xیs?��tT��ۡ,^p����VZ��|���ǽ�^�S⬆PE�G��P�mb��%���~$u�A��L���řk�ҋ�r
S������8֍(�Ed13|�+�l#θ�⼤'%�jp7W����)���y��B����$���#J���7�k�^	�xI�����ri+遫����G_��9�9��o��9&��^0�ԕ�����a��FR:v�&Ŗ�:��	��1]̝;���y%�[�#g���A��W[A/�r��N	��=����R��:8�-����� >����2V��B1��݆]��}�����w��"�x���$������R�>:=U�<r��7[�L+�M�:nƌ�x1�E5
�ŀiA��
�	i�����?�}͏��׀���Jz�],{����J��GWg,�4γ��@=���Ao��ϯw&�B^�,2�lv�_2	Ek7f)�R�Q��E�nݴ���+�'�B͞��Z:v�_ -��p8�K���g�i]���C��Ǔ��c]��Q�z�
Em��d�<�wd�K�߯T5��g��-�;w3���d�iWxn�UA�H�ID�C;Ż�r҅V���U�#eđbq�ύ(>����O@K%��^NF���_���V��Vۨ�7LN��<�'d P
  UI� -�%��`�d�#�js���V� �Y{p-�/˰��2V�;������>]�����TK3Qљ�=�����;(T�L�q#�ߖ�誝&�1��� 0-E��="3���q����r�b	�n��M������ͯn�zf�(�º�|H���g���d!1bJ����]r��0��ZaH�s ���	 Ɩ�A����+u�;Z���-�t����I�-���[YD��L��uI��~�Z��mD��2�ߙ)�np�yGQ�(9(ق��.�� p&���HP��A �i>-�+@�\�g>�)�2 �Ē��)��Z�lH�xj�ŹS_rb�JC�nA�y�X��Y{�G��6'�=5���2i��(�>�O���pp2R*��*��+���:��sPv��c�����Y�����Pdǃ$�̗v�)<�xPb4�H�Я��`�1qD�SGy�I��9dG�� 4]L���b�auts�%�.�(P���g�7=# �&���!�*oIo�p����J_@��u2��2.EҚ:�/]F7���5��U��'�e/D�+%��̊���L�+_R}��|%���/M���h�]×P/mmM�qZ1�WG;�De乫��R.�/��L���\�[~	Gq�0���,�X]�,y��D�~i�����%�^}�:N�#?��aZ���2$�_2�{{Fa���A�wb��@^>��jio�r��*O~V^)_
Y�������sׂ���I�r���[���n���2��֪�ꒅ�v���
�.Ȣ��	�OL5�� Q��D�0�Zj��JG��,�d�(S�w`~Hͨf��?R�V�L�C��7s5wNI������b}|��I�7�f�s�,B�_mb��&�[���_�����@�L��^h�^�d�<��7�(ZxF�K�*h`U߭9���y[�Q8"(�Hg���~!�A1f|-6i�F���%��v��
Y�FQ�}ԩ��Ð��B��F�ZC��Xx�AWߎ6),�߲]Y@����ғ��ߧ��0?��ïTKw�+��FA��iaws��"�S���s����{�V�w���[��kd�X_v3D�|�ϻm7E��	]&���J+���vM�Ky$�4���q}v#s{0���z�x�^�/б����;jO������t�������ElX�ɪ��>s����y[������ͽ�≛.�3K��_Vd��)�.ݫz�k�Aqj@)��&��+�op�S��uVoLX_����wE(X!�w��������2�8o\�2�U���L=�!�9�*���D�F�*DӶ�I)�ئ4�\��A�iUed�9s���jރ �y�'<�.T*�k�oާ3[N+W1��;zp��n�Q�Af�Z4��]���w��&M�`$�u�	X�SP�h���"�B<�m�,��1R���$��>�%h�YY�W"� n��n��>��%��j�����^�?��p�o!.$z]4:{��O�{$�$��~ϿPo����k��2h�tÅ|xf���pT�2����-�ԁR_�Cr<��&�ũ���m.~�SM�3�.;���6EI_`>��P�uuY_n�N�L]��[�ֳ�8���}F��hU?����
j�#���j4�3����Gf�m8.Ԏ�([l��`ň%���&r��s�	�U�Ϋ�1�؅T�����q����1��6���	~?�'̴Cܟu�k`P\�����V�}y�SOt�_qR-�_��y�i./����=M�x��A��Ouoϒ��7�����&[{���`����o�C�%�;�������=�}v���ǁ�ts-A_�Aچ��kUI�U�uX� ��W/ލ��zN��f�B�L��EU�/B52T�d|�5��U�	["��TB���d��?�S�4��O	�����x�v�N�����R���Dd�R����J��u*�@��2�Ȳ��P-T^'�`�k`��-f0���2˦��:�M3�Ͻ�P�P#����K��s,�w�����.`a����5`\\�?F*
k|�5�,LQk"�p�b�
�}5H]W�6�w˶�3�w]��� v��V�	��^�̓}LM�DB R=����\��ŝ�s̖e{3ovaz?-q�ħȯ��MIG��rlTe��.��ŗ���A��V�N�h�BikZ=\��L�/���2���~����9f�<��~����ݯ�Y[�A-�V�A&��x8�d�6�����k-�]J�J���T�k)��|xo4���#iAXHͼ��f���?�	��s��G=���C�h[��ŗ���8�S�$�M �{�����M80Ƒ3��>U`���Di4�{��?i���u8�l3J7�|B��]�y?�C6gU	�in�yo�В�6��c���fYD)(��N�n �sy6R�oׯ���I��6��ds���a������ը����`v��n� �n��%�I0�s������ڇ����2����
��D�SrP�p��{�OE�Ppj��A1����f�`�P�M=���p x7�D��u��i� ����g�˃��Y�[ ��=��t�B���j���7�-���cʻJ�B5��	p���yD�$p���S���XE�*�|����j�-N����ނ��     