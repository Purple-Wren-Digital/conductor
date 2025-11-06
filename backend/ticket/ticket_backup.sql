--
-- PostgreSQL database dump
--

\restrict HG96XiOtjqvWoTl6cxluWbm32zyC5pyLifL3IQJEIO0f2Tf6IeAUTmBYRboSfVK

-- Dumped from database version 15.7 (Debian 15.7-1.pgdg110+1)
-- Dumped by pg_dump version 18.0

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: CommentType; Type: TYPE; Schema: public; Owner: encore-admin
--

CREATE TYPE public."CommentType" AS ENUM (
    'CANCEL',
    'FEEDBACK',
    'FOLLOW_UP',
    'ISSUE',
    'NOTE',
    'REMINDER',
    'QUESTION'
);


ALTER TYPE public."CommentType" OWNER TO "encore-admin";

--
-- Name: Priority; Type: TYPE; Schema: public; Owner: encore-admin
--

CREATE TYPE public."Priority" AS ENUM (
    'LOW',
    'MEDIUM',
    'HIGH',
    'CRITICAL'
);


ALTER TYPE public."Priority" OWNER TO "encore-admin";

--
-- Name: Role; Type: TYPE; Schema: public; Owner: encore-admin
--

CREATE TYPE public."Role" AS ENUM (
    'ADMIN',
    'AGENT',
    'STAFF'
);


ALTER TYPE public."Role" OWNER TO "encore-admin";

--
-- Name: TicketStatus; Type: TYPE; Schema: public; Owner: encore-admin
--

CREATE TYPE public."TicketStatus" AS ENUM (
    'CREATED',
    'ASSIGNED',
    'IN_PROGRESS',
    'AWAITING_RESPONSE',
    'PENDING',
    'RESOLVED',
    'CLOSED',
    'CANCELLED'
);


ALTER TYPE public."TicketStatus" OWNER TO "encore-admin";

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Comments; Type: TABLE; Schema: public; Owner: encore-admin
--

CREATE TABLE public."Comments" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "ticketId" text NOT NULL,
    type public."CommentType" NOT NULL,
    content text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    internal boolean DEFAULT true NOT NULL
);


ALTER TABLE public."Comments" OWNER TO "encore-admin";

--
-- Name: MarketCenter; Type: TABLE; Schema: public; Owner: encore-admin
--

CREATE TABLE public."MarketCenter" (
    id text NOT NULL,
    address1 text NOT NULL,
    address2 text,
    city text NOT NULL,
    code text NOT NULL,
    email text NOT NULL,
    name text NOT NULL,
    phone text NOT NULL,
    region text NOT NULL,
    state text NOT NULL,
    timezone text NOT NULL,
    zip text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."MarketCenter" OWNER TO "encore-admin";

--
-- Name: Ticket; Type: TABLE; Schema: public; Owner: encore-admin
--

CREATE TABLE public."Ticket" (
    id text NOT NULL,
    title text NOT NULL,
    status public."TicketStatus" DEFAULT 'CREATED'::public."TicketStatus" NOT NULL,
    priority public."Priority" NOT NULL,
    "marketCenterId" text NOT NULL,
    "assigneeId" text NOT NULL,
    category text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "creatorId" text NOT NULL,
    description text,
    "dueDate" timestamp(3) without time zone,
    internal boolean DEFAULT true NOT NULL,
    "resolvedAt" timestamp(3) without time zone,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Ticket" OWNER TO "encore-admin";

--
-- Name: TicketStatusHistory; Type: TABLE; Schema: public; Owner: encore-admin
--

CREATE TABLE public."TicketStatusHistory" (
    id text NOT NULL,
    "updatedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "ticketId" text NOT NULL,
    status public."TicketStatus" NOT NULL
);


ALTER TABLE public."TicketStatusHistory" OWNER TO "encore-admin";

--
-- Name: User; Type: TABLE; Schema: public; Owner: encore-admin
--

CREATE TABLE public."User" (
    id text NOT NULL,
    "auth0Id" text NOT NULL,
    email text NOT NULL,
    phone text,
    name text NOT NULL,
    role public."Role"[] DEFAULT ARRAY['AGENT'::public."Role"] NOT NULL,
    "marketCenterId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."User" OWNER TO "encore-admin";

--
-- Data for Name: Comments; Type: TABLE DATA; Schema: public; Owner: encore-admin
--

COPY public."Comments" (id, "userId", "ticketId", type, content, "createdAt", internal) FROM stdin;
\.


--
-- Data for Name: MarketCenter; Type: TABLE DATA; Schema: public; Owner: encore-admin
--

COPY public."MarketCenter" (id, address1, address2, city, code, email, name, phone, region, state, timezone, zip, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Ticket; Type: TABLE DATA; Schema: public; Owner: encore-admin
--

COPY public."Ticket" (id, title, status, priority, "marketCenterId", "assigneeId", category, "createdAt", "creatorId", description, "dueDate", internal, "resolvedAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: TicketStatusHistory; Type: TABLE DATA; Schema: public; Owner: encore-admin
--

COPY public."TicketStatusHistory" (id, "updatedAt", "ticketId", status) FROM stdin;
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: encore-admin
--

COPY public."User" (id, "auth0Id", email, phone, name, role, "marketCenterId", "createdAt") FROM stdin;
\.


--
-- Name: Comments Comments_pkey; Type: CONSTRAINT; Schema: public; Owner: encore-admin
--

ALTER TABLE ONLY public."Comments"
    ADD CONSTRAINT "Comments_pkey" PRIMARY KEY (id);


--
-- Name: MarketCenter MarketCenter_pkey; Type: CONSTRAINT; Schema: public; Owner: encore-admin
--

ALTER TABLE ONLY public."MarketCenter"
    ADD CONSTRAINT "MarketCenter_pkey" PRIMARY KEY (id);


--
-- Name: TicketStatusHistory TicketStatusHistory_pkey; Type: CONSTRAINT; Schema: public; Owner: encore-admin
--

ALTER TABLE ONLY public."TicketStatusHistory"
    ADD CONSTRAINT "TicketStatusHistory_pkey" PRIMARY KEY (id);


--
-- Name: Ticket Ticket_pkey; Type: CONSTRAINT; Schema: public; Owner: encore-admin
--

ALTER TABLE ONLY public."Ticket"
    ADD CONSTRAINT "Ticket_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: encore-admin
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: Comments_userId_ticketId_key; Type: INDEX; Schema: public; Owner: encore-admin
--

CREATE UNIQUE INDEX "Comments_userId_ticketId_key" ON public."Comments" USING btree ("userId", "ticketId");


--
-- Name: MarketCenter_code_key; Type: INDEX; Schema: public; Owner: encore-admin
--

CREATE UNIQUE INDEX "MarketCenter_code_key" ON public."MarketCenter" USING btree (code);


--
-- Name: User_auth0Id_key; Type: INDEX; Schema: public; Owner: encore-admin
--

CREATE UNIQUE INDEX "User_auth0Id_key" ON public."User" USING btree ("auth0Id");


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: encore-admin
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: User_phone_key; Type: INDEX; Schema: public; Owner: encore-admin
--

CREATE UNIQUE INDEX "User_phone_key" ON public."User" USING btree (phone);


--
-- Name: Comments Comments_ticketId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: encore-admin
--

ALTER TABLE ONLY public."Comments"
    ADD CONSTRAINT "Comments_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES public."Ticket"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Comments Comments_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: encore-admin
--

ALTER TABLE ONLY public."Comments"
    ADD CONSTRAINT "Comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: TicketStatusHistory TicketStatusHistory_ticketId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: encore-admin
--

ALTER TABLE ONLY public."TicketStatusHistory"
    ADD CONSTRAINT "TicketStatusHistory_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES public."Ticket"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Ticket Ticket_assigneeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: encore-admin
--

ALTER TABLE ONLY public."Ticket"
    ADD CONSTRAINT "Ticket_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Ticket Ticket_creatorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: encore-admin
--

ALTER TABLE ONLY public."Ticket"
    ADD CONSTRAINT "Ticket_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: Ticket Ticket_marketCenterId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: encore-admin
--

ALTER TABLE ONLY public."Ticket"
    ADD CONSTRAINT "Ticket_marketCenterId_fkey" FOREIGN KEY ("marketCenterId") REFERENCES public."MarketCenter"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: User User_marketCenterId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: encore-admin
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_marketCenterId_fkey" FOREIGN KEY ("marketCenterId") REFERENCES public."MarketCenter"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- PostgreSQL database dump complete
--

\unrestrict HG96XiOtjqvWoTl6cxluWbm32zyC5pyLifL3IQJEIO0f2Tf6IeAUTmBYRboSfVK

