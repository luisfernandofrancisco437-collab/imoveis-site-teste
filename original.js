// Behaviours from the original homepage, attached to its server-rendered DOM.
// No CRM/Supabase dependency and no automatic message sending.
(()=>{
  const data=document.getElementById('catalogue-data');
  if(data){
    const catalogue=JSON.parse(data.textContent),byCode=new Map(catalogue.map(p=>[p.codigo,p]));
    const search=document.querySelector('.searchPanel input'),operation=document.querySelector('.searchPanel select');
    const cards=Array.from(document.querySelectorAll('.propertyCard'));
    const counter=document.querySelector('.sectionTitle>p'),grid=document.querySelector('.catalog .grid');
    const empty=document.createElement('div');empty.className='empty';empty.hidden=true;empty.textContent='Nenhum imóvel encontrado para esta busca.';grid.after(empty);
    function update(){const query=search.value.toLocaleLowerCase('pt-BR');let count=0;for(const card of cards){const p=byCode.get(card.querySelector('.code').textContent.trim());const text=[p.codigo,p.titulo,p.cidade,p.bairro,p.tipo].join(' ').toLocaleLowerCase('pt-BR');const visible=(!operation.value||p.operacao===operation.value||p.operacao==='Locação e Venda')&&text.includes(query);card.hidden=!visible;if(visible)count++;}counter.textContent=count+' '+(count===1?'imóvel encontrado':'imóveis encontrados');empty.hidden=count!==0;}
    search.addEventListener('input',update);operation.addEventListener('change',update);
  }
  const form=document.querySelector('.ownerForm');
  if(form)form.addEventListener('submit',event=>{event.preventDefault();if(!form.reportValidity())return;const fields=new FormData(form);const message=['Olá, Luis Fernando! Gostaria de cadastrar um imóvel.',`Operação: ${fields.get('operacao')}`,`Nome: ${fields.get('nome')}`,`Telefone: ${fields.get('telefone')}`,`Tipo: ${fields.get('tipo')}`,`Cidade: ${fields.get('cidade')}`,`Bairro: ${fields.get('bairro')}`,`Endereço: ${fields.get('endereco')}`,`Valor pretendido: ${fields.get('valor')||'A combinar'}`,`Detalhes: ${fields.get('detalhes')||'Não informado'}`].join('\n');window.open('https://wa.me/5519989817571?text='+encodeURIComponent(message),'_blank','noopener,noreferrer');});
})();
