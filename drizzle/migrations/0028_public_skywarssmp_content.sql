CREATE POLICY "Public SkywarsSMP page read"
ON public.site_content FOR SELECT TO public
USING (key = 'skywarssmp_page');