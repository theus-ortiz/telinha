export namespace amigos {
	
	export class Amigo {
	    nome: string;
	    ip: string;
	
	    static createFrom(source: any = {}) {
	        return new Amigo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.nome = source["nome"];
	        this.ip = source["ip"];
	    }
	}

}

export namespace rede {
	
	export class PC {
	    nome: string;
	    ip: string;
	    online: boolean;
	
	    static createFrom(source: any = {}) {
	        return new PC(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.nome = source["nome"];
	        this.ip = source["ip"];
	        this.online = source["online"];
	    }
	}

}

