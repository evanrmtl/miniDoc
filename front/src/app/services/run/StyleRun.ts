class StyleRun {
    public start: number; 
    public length: number;
    public style: {
        bold?: boolean;
        italic?: boolean;
        underline?: boolean;
        color?: string;
    };
    public  author?: string;

    constructor(start: number, length: number, style: { bold?: boolean; italic?: boolean; underline?: boolean; color?: string }, author?: string) {
        this.start = start;
        this.length = length;
        this.style = style;
        this.author = author;
    }

    
}