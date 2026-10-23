// Web preview keeps auth tokens in memory; native builds use OS secure storage.
const values=new Map<string,string>();
export async function getItemAsync(key:string){return values.get(key)??null}
export async function setItemAsync(key:string,value:string){values.set(key,value)}
export async function deleteItemAsync(key:string){values.delete(key)}
